import sharp from 'sharp';
import { createWorker, type Worker } from 'tesseract.js';

/**
 * Tesseract worker lifecycle
 * - We keep a single shared worker Promise (`workerP`) to avoid repeated spins.
 * - After a certain number of jobs (MAX_JOBS_BEFORE_RESET), we restart the worker
 *   to mitigate memory leaks or accuracy degradation over long runs.
 */
let workerP: Promise<Worker> | null = null;
let jobsProcessed = 0;
const MAX_JOBS_BEFORE_RESET = 500;

// Preload (create) a Tesseract worker if it doesn't exist.
async function preloadWorker(langs = 'tha+eng') {
  if (!workerP) {
    workerP = createWorker(langs);
  }
  return workerP;
}

async function closeWorker() {
  if (workerP) {
    const w = await workerP;
    await w.terminate();
    workerP = null;
    jobsProcessed = 0;
  }
}

async function getWorker(langs = 'tha+eng') {
  if (!workerP) await preloadWorker(langs);
  if (jobsProcessed >= MAX_JOBS_BEFORE_RESET) {
    await closeWorker();
    await preloadWorker(langs);
  }
  return workerP!;
}

export interface OcrTransaction {
  bank: string;
  amount: string | null;
  date: string | null;
  time: string | null;
  ref: string | null;
  rawText: string;
}

/**
 * Perform OCR on a bank slip image buffer and extract structured fields.
 * Processing pipeline:
 *  1) Image pre-processing with Sharp to improve OCR quality
 *  2) OCR with Tesseract.js
 *  3) Post-processing: normalize text and extract amount/date/time/bank/ref
 */
export async function ocrSlip(buffer: Buffer): Promise<OcrTransaction> {
  // Image pre-processing
  const processed = await sharp(buffer)
    .resize(2400, null, { withoutEnlargement: true })
    .grayscale()
    .normalise()
    .median(1)
    .sharpen({ sigma: 1, m1: 0.5, m2: 2 })
    .threshold(128)
    .toFormat('png')
    .toBuffer();

  const worker = await getWorker();
  const result = await worker.recognize(processed);
  jobsProcessed++;

  // Normalize whitespace for simpler pattern matching
  const rawText = result.data.text;
  const text = rawText.replace(/\s+/g, ' ').trim();

  /**
   * Extract the most plausible amount (numeric) from the text.
   * Strategy:
   *  - Use multiple patterns (with/without decimals/commas, with context keywords)
   *  - Score candidates by pattern rank, context, decimal precision, comma usage
   *  - Penalize obvious false positives (years/days)
   * Returns a normalized string without commas (e.g. "1234.56"), or null.
   */
  function extractAmount(text: string): string | null {
    const patterns = [
      // Values with contextual keywords (Thai/English)
      /(?:จำนวน|amount|รวม|total|ยอด|เงิน)[\s:]*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)(?:\s|$|บาท)/gi,
      // Standard with decimals (1,234.56)
      /(\d{1,3}(?:,\d{3})*\.\d{2})/g,
      // Integer with thousand separators (1,234)
      /(\d{1,3}(?:,\d{3})+)/g,
      // Plain decimal with >= 3 leading digits (1234.56)
      /(\d{3,}\.\d{2})/g,
      // No comma but decimal with >= 4 leading digits
      /(\d{4,}\.\d{2})/g,
    ];

    const candidates: { value: number; text: string; score: number }[] = [];

    for (let i = 0; i < patterns.length; i++) {
      const matches = [...text.matchAll(patterns[i])];

      for (const match of matches) {
        const amountText = match[1];
        const numericValue = parseFloat(amountText.replace(/,/g, ''));

        if (numericValue >= 0.01 && numericValue <= 99999999) {
          let score = 10 - i; // earlier patterns rank higher by default

          // Contextual bonus
          const context = match[0].toLowerCase();
          if (
            context.includes('จำนวน') ||
            context.includes('amount') ||
            context.includes('รวม') ||
            context.includes('total')
          ) {
            score += 5;
          }

          // Prefer two decimal places (currency-like)
          if (
            amountText.includes('.') &&
            amountText.split('.')[1]?.length === 2
          ) {
            score += 3;
          }

          // Prefer thousand separators (1,234.56)
          if (amountText.includes(',')) {
            score += 2;
          }

          // Penalize likely years/dates
          if (numericValue > 1900 && numericValue < 2100) score -= 3;
          if (numericValue <= 31 && !amountText.includes('.')) score -= 2;

          candidates.push({ value: numericValue, text: amountText, score });
        }
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates.length > 0 ? candidates[0].text.replace(/,/g, '') : null;
  }

  /**
   * Extract a plausible date string from the text.
   * Supports:
   *  - Thai short/long month names with Buddhist Era (พ.ศ.) or YY
   *  - Numeric formats DD/MM/YYYY and DD-MM-YYYY
   * Scores higher for valid day/month ranges and Thai BE years.
   */
  function extractDate(text: string): string | null {
    const patterns = [
      // Thai short months + BE (พ.ศ. 25xx or 26xx)
      /(\d{1,2}\s*(?:ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)\s*(?:25|26)\d{2})/gi,
      // Thai short months + 2-digit year
      /(\d{1,2}\s*(?:ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.)\s*\d{2})/gi,
      // Thai long months + full year
      /(\d{1,2}\s*(?:มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)\s*(?:25|26|20)\d{2})/gi,
      // DD/MM/YYYY
      /(\d{1,2}\/\d{1,2}\/(?:20|25|26)\d{2})/g,
      // DD-MM-YYYY
      /(\d{1,2}-\d{1,2}-(?:20|25|26)\d{2})/g,
    ];

    const candidates: { text: string; score: number }[] = [];

    for (let i = 0; i < patterns.length; i++) {
      const matches = [...text.matchAll(patterns[i])];

      for (const match of matches) {
        const dateText = match[1];
        let score = 10 - i;

        // Validate day/month
        if (dateText.includes('/') || dateText.includes('-')) {
          const parts = dateText.split(/[/-]/);
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]);

          if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
            score += 3;
          } else {
            score -= 5;
          }
        }

        // Bonus for BE years
        if (dateText.match(/25\d{2}|26\d{2}/)) {
          score += 3;
        }

        // Slight bonus for Thai month wording
        if (dateText.includes('ม.ค.') || dateText.includes('มกราคม')) {
          score += 2;
        }

        candidates.push({ text: dateText, score });
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates.length > 0 ? candidates[0].text : null;
  }

  /**
   * Extract a plausible time string.
   * Supports HH:MM(:SS) with separators ':' or '.' and optional context words.
   * Normalizes '.' to ':' before validation.
   */
  function extractTime(text: string): string | null {
    const patterns = [
      // With context words
      /(?:เวลา|time|at)[\s:]*(\d{1,2}[:.]\d{2}(?:[:.]\d{2})?)/gi,
      // HH:MM:SS
      /(\d{1,2}[:.]\d{2}[:.]\d{2})/g,
      // HH:MM
      /(\d{1,2}[:.]\d{2})/g,
      // HH.MM
      /(\d{1,2}\.\d{2})/g,
    ];

    const candidates: { text: string; score: number }[] = [];

    for (let i = 0; i < patterns.length; i++) {
      const matches = [...text.matchAll(patterns[i])];

      for (const match of matches) {
        let timeText = match[1] || match[0];
        let score = 10 - i;

        // Normalize to HH:MM(:SS)
        timeText = timeText.replace(/\./g, ':');

        const timeParts = timeText.split(':');
        const hours = parseInt(timeParts[0]);
        const minutes = parseInt(timeParts[1]);
        // Basic HH:MM validation
        if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
          score += 5;

          // Context bonus
          const context = match[0].toLowerCase();
          if (context.includes('เวลา') || context.includes('time')) {
            score += 3;
          }

          // Slight preference for typical business hours
          if (hours >= 6 && hours <= 22) {
            score += 2;
          }

          // penalties
          if (hours > 24 || minutes > 59) {
            score -= 10;
          }

          // Penalize false positives that look like amounts (e.g., 12.3)
          if (
            timeText.includes('.') &&
            timeParts.length === 2 &&
            parseInt(timeParts[1]) < 10
          ) {
            score -= 3;
          }

          candidates.push({ text: timeText, score });
        }
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates.length > 0 ? candidates[0].text : null;
  }

  function detectBank(text: string): string {
    const bankPatterns = [
      { code: 'KTB', patterns: ['กรุงไทย', 'KTB', 'Krung Thai'] },
      { code: 'SCB', patterns: ['SCB', 'ไทยพาณิชย์', 'Siam Commercial'] },
      { code: 'KBANK', patterns: ['กสิกร', 'KBank', 'KASIKORN', 'K-Bank'] },
      { code: 'BBL', patterns: ['กรุงเทพ', 'BBL', 'Bangkok Bank'] },
      { code: 'TMB', patterns: ['ทีเอ็มบี', 'TMB', 'ทหารไทย'] },
      { code: 'BAY', patterns: ['กรุงศรี', 'BAY', 'Krungsri'] },
      { code: 'UOB', patterns: ['ยูโอบี', 'UOB'] },
      { code: 'GSB', patterns: ['ออมสิน', 'GSB'] },
    ];

    for (const bank of bankPatterns) {
      for (const pattern of bank.patterns) {
        if (text.includes(pattern)) {
          return bank.code;
        }
      }
    }
    return 'UNKNOWN';
  }

  const refMatch = text.match(/(รหัส|เลขที่รายการ|Ref)[^\d]*(\d{6,})/i);

  return {
    bank: detectBank(text),
    amount: extractAmount(text),
    date: extractDate(text),
    time: extractTime(text),
    ref: refMatch?.[2] ?? null,
    rawText: text,
  };
}
