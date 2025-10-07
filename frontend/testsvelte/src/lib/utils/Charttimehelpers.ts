export type PeriodKey = 'Last 7 days' | 'Last 30 days' | 'Last 90 days' | 'Custom range';
export type Granularity = 'daily' | 'weekly' | 'monthly' | 'quarterly';
export type DateRange = { from: Date; to: Date };
export type CategoryResult = { labels: string[]; length: number };

const TZ = 'Asia/Bangkok';
const fmtWeekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: TZ });
const fmtDayMon = new Intl.DateTimeFormat('en-US', {
	month: 'short',
	day: 'numeric',
	timeZone: TZ
});
const fmtMonth = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: TZ });
const fmtMonthYr = new Intl.DateTimeFormat('en-US', {
	month: 'short',
	year: '2-digit',
	timeZone: TZ
});

const addDays = (d: Date, n: number) => {
	const x = new Date(d);
	x.setDate(x.getDate() + n);
	return x;
};
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const today = () => startOfDay(new Date());
const daysBetween = (a: Date, b: Date) =>
	Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000);

const getQuarter = (d: Date) => Math.floor(d.getMonth() / 3) + 1;
const quarterLabel = (d: Date) => `Q${getQuarter(d)} ${d.getFullYear()}`;

export function validateRange(range: DateRange): DateRange {
	const t = today();
	let from = startOfDay(range.from);
	let to = startOfDay(range.to);
	if (to > t) to = t;
	if (from > t) from = t;
	if (to < from) to = from;
	return { from, to };
}

export function makeLast7Days(): CategoryResult {
	const t = today();
	const days = Array.from({ length: 7 }, (_, i) => addDays(t, -(6 - i)));
	const labels = days.map((d) => fmtWeekday.format(d));
	return { labels, length: 7 };
}

export function makeLast30Days(granularity: Granularity = 'daily'): CategoryResult {
	const t = today();
	if (granularity === 'daily') {
		const days = Array.from({ length: 30 }, (_, i) => addDays(t, -(29 - i)));
		return { labels: days.map((d) => fmtDayMon.format(d)), length: 30 };
	}
	const buckets = [...Array(4)].map((_, bi) => {
		const end = addDays(t, -(7 * (3 - bi)));
		const start = addDays(end, -6);
		const sameMonth = start.getMonth() === end.getMonth();
		const left = sameMonth ? String(start.getDate()) : fmtDayMon.format(start);
		const right = fmtDayMon.format(end);
		return `${left}–${right}`;
	});
	return { labels: buckets, length: buckets.length };
}

export type QuarterBucket = { start: Date; end: Date; label: string };

export function splitRangeIntoQuarters(range: DateRange): QuarterBucket[] {
	const r = validateRange(range);
	const totalDays = daysBetween(r.from, r.to) + 1; // inclusive
	const qLen = Math.ceil(totalDays / 4);

	const buckets: QuarterBucket[] = [];
	let s = new Date(r.from);

	for (let i = 0; i < 4; i++) {
		const remaining = daysBetween(s, r.to) + 1;
		if (remaining <= 0) break;

		const len = i < 3 ? Math.min(qLen, remaining) : remaining; // last bucket absorbs remainder
		const e = addDays(s, len - 1);

		const monthLabel = fmtMonth.format(e); // "Aug", "Sep", ...
		buckets.push({ start: s, end: e, label: `Q${i + 1} ${monthLabel}` });

		s = addDays(e, 1);
	}

	return buckets;
}

export function makeLast90Days(granularity: Granularity = 'monthly'): CategoryResult {
	const t = today();
	const start = addDays(t, -89); // inclusive

	if (granularity === 'quarterly') {
		const qs = splitRangeIntoQuarters({ from: start, to: t });
		return { labels: qs.map((q) => q.label), length: qs.length };
	}

	// monthly (default) — months that intersect the 90d window
	const months: Date[] = [];
	let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
	const endMonth = new Date(t.getFullYear(), t.getMonth(), 1);
	while (cursor <= endMonth) {
		months.push(new Date(cursor));
		cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
	}
	const crossesYear = new Set(months.map((m) => m.getFullYear())).size > 1;
	const labels = months.map((m) => (crossesYear ? fmtMonthYr.format(m) : fmtMonth.format(m)));
	return { labels, length: labels.length };
}

export function makeRangeCategories(range: DateRange, granularity?: Granularity): CategoryResult {
	const r = validateRange(range);
	const span = daysBetween(r.from, r.to) + 1;
	const g: Granularity = granularity ?? (span <= 31 ? 'daily' : span <= 120 ? 'weekly' : 'monthly');

	if (g === 'daily') {
		const days = Array.from({ length: span }, (_, i) => addDays(r.from, i));
		return { labels: days.map((d) => fmtDayMon.format(d)), length: span };
	}
	if (g === 'weekly') {
		const buckets: string[] = [];
		let start = r.from;
		while (start <= r.to) {
			const end = addDays(start, Math.min(6, daysBetween(start, r.to)));
			const sameMonth = start.getMonth() === end.getMonth();
			const left = sameMonth ? String(start.getDate()) : fmtDayMon.format(start);
			const right = fmtDayMon.format(end);
			buckets.push(`${left}–${right}`);
			start = addDays(end, 1);
		}
		return { labels: buckets, length: buckets.length };
	}
	const labels: string[] = [];
	let cursor = new Date(r.from.getFullYear(), r.from.getMonth(), 1);
	const lastMonth = new Date(r.to.getFullYear(), r.to.getMonth(), 1);
	const crossesYear = r.from.getFullYear() !== r.to.getFullYear();
	while (cursor <= lastMonth) {
		labels.push(crossesYear ? fmtMonthYr.format(cursor) : fmtMonth.format(cursor));
		cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
	}
	return { labels, length: labels.length };
}

// --- types to help aggregation (optional) ---
export type Bucket = { start: Date; end: Date; label: string };

// Split a given month (1st..last day) into 4 week-like buckets: 1–7, 8–14, 15–21, 22–end
function splitMonthIntoFourWeeks(monthStart: Date): Bucket[] {
	const start = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
	const endOfMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0); // last day
	const monthName = fmtMonth.format(start);

	const ranges = [
		{ s: 1, e: 7 },
		{ s: 8, e: 14 },
		{ s: 15, e: 21 },
		{ s: 22, e: endOfMonth.getDate() }
	];

	return ranges.map((r, i) => ({
		start: new Date(start.getFullYear(), start.getMonth(), r.s),
		end: new Date(start.getFullYear(), start.getMonth(), r.e),
		label: `${monthName} W${i + 1}`
	}));
}

/**
 * 90 days labeled as 3 months × 4 buckets each (12 labels).
 * Buckets are month-local weeks (1–7, 8–14, 15–21, 22–end).
 */
export function makeLast90DaysWeeklyByMonth(): {
	labels: string[];
	length: number;
	buckets: Bucket[];
} {
	const t = today();
	const start90 = addDays(t, -89); // inclusive 90-day window
	// Collect unique month starts intersecting the window (usually 3)
	const monthStarts: Date[] = [];
	let cursor = new Date(start90.getFullYear(), start90.getMonth(), 1);
	const lastMonthStart = new Date(t.getFullYear(), t.getMonth(), 1);
	while (cursor <= lastMonthStart) {
		monthStarts.push(new Date(cursor));
		cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
	}

	// For each month, split into 4 buckets and keep those that intersect the 90d window
	const allBuckets = monthStarts
		.flatMap((ms) => splitMonthIntoFourWeeks(ms))
		.filter((b) => !(b.end < start90 || b.start > t)); // keep intersection

	// If result isn’t exactly 12 (edge months partially outside window), still fine;
	// you’ll just get 8–12 buckets depending on today’s date. Most months → 12.
	const labels = allBuckets.map((b) => b.label);
	return { labels, length: labels.length, buckets: allBuckets };
}

// (Optional) Helper to aggregate daily rows into these buckets
export type DailyRow = { date: string | Date; income?: number; expense?: number };
export function aggregateDailyToBuckets<T extends DailyRow>(
	rows: T[],
	buckets: Bucket[],
	pick: (r: T) => number // e.g., r => r.income ?? 0
): number[] {
	const norm = (d: string | Date) => {
		const x = new Date(d);
		return new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
	};
	const byDay = rows.map((r) => ({ t: norm(r.date), v: pick(r) }));
	return buckets.map((b) => {
		const s = new Date(b.start.getFullYear(), b.start.getMonth(), b.start.getDate()).getTime();
		const e = new Date(b.end.getFullYear(), b.end.getMonth(), b.end.getDate()).getTime();
		let sum = 0;
		for (const r of byDay) if (r.t >= s && r.t <= e) sum += r.v;
		return sum;
	});
}
