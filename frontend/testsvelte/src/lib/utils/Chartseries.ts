// Build Apex-like series from raw transactions by bucketing into time ranges.

export type TxType = 'INCOME' | 'EXPENSE';
export type Tx = { amount: number | string; date: string | Date; type: TxType };

// ---- Output (ApexAxisChartSeries-compatible shape) ----
export type AxisSeries = { name: string; data: number[]; color?: string }[];

// ---- Options ----
export type PresetOption =
	| { kind: '7d' } // last 7 days (daily)
	| { kind: '30d' } // last 30 days (daily)
	| { kind: '90d-weeklyByMonth' }; // last 90 days as 3 months × 4 "weeks" per month (≈12 buckets)

export type CustomOption = {
	kind: 'custom';
	from: string | Date;
	to: string | Date;
	// daily = per day, monthly = per calendar month,
	// weeklyByMonth = W1..W4 inside each month across the range
	// auto = let the system pick based on date span (NEW!)
	granularity?: 'daily' | 'monthly' | 'weeklyByMonth' | 'auto';
};

export type BuildInput = PresetOption | CustomOption;

export type BuildResult = {
	series: AxisSeries;
	categories: string[]; // labels aligned with data points
};

// ================== Internals ==================
type Bucket = { start: Date; end: Date; label: string };

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

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => {
	const x = new Date(d);
	x.setDate(x.getDate() + n);
	return x;
};
const lastDayOfMonth = (y: number, m: number) => new Date(y, m + 1, 0);
const normTime = (d: string | Date) => startOfDay(new Date(d)).getTime();
const daysBetween = (a: Date, b: Date) =>
	Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000);

const today = () => startOfDay(new Date());
const clampToToday = (d: Date) => (d > today() ? today() : d);

// ---- bucket builders ----
function buildDailyBuckets(from: Date, to: Date): Bucket[] {
	const s = startOfDay(from),
		e = startOfDay(to);
	const out: Bucket[] = [];
	for (let d = new Date(s); d <= e; d = addDays(d, 1)) {
		out.push({ start: d, end: d, label: fmtDayMon.format(d) });
	}
	return out;
}

function buildMonthlyBuckets(from: Date, to: Date): Bucket[] {
	const out: Bucket[] = [];
	let cur = new Date(from.getFullYear(), from.getMonth(), 1);
	const end = new Date(to.getFullYear(), to.getMonth(), 1);
	const crossesYear = from.getFullYear() !== to.getFullYear();
	
	while (cur <= end) {
		const y = cur.getFullYear(),
			m = cur.getMonth();
		const s = new Date(y, m, 1);
		const e = lastDayOfMonth(y, m);
		const label = crossesYear ? fmtMonthYr.format(s) : fmtMonth.format(s);
		out.push({ start: s, end: e, label });
		cur = new Date(y, m + 1, 1);
	}
	return out;
}

// Split a month into 4 buckets: 1–7, 8–14, 15–21, 22–end
function splitMonthIntoFourWeeks(monthStart: Date): Bucket[] {
	const y = monthStart.getFullYear(),
		m = monthStart.getMonth();
	const end = lastDayOfMonth(y, m).getDate();
	const monthName = fmtMonth.format(monthStart);
	const ranges = [
		{ s: 1, e: 7 },
		{ s: 8, e: 14 },
		{ s: 15, e: 21 },
		{ s: 22, e: end }
	];
	return ranges.map((r, i) => ({
		start: new Date(y, m, r.s),
		end: new Date(y, m, r.e),
		label: `${monthName} W${i + 1}`
	}));
}

// 90d as 3 months × 4 buckets each, clipped to the 90d window (≈12 buckets)
function build90dWeeklyByMonthBuckets(ref = new Date()): Bucket[] {
	const to = today();
	const from = addDays(to, -89);
	const months: Date[] = [];
	let cur = new Date(from.getFullYear(), from.getMonth(), 1);
	const last = new Date(to.getFullYear(), to.getMonth(), 1);
	while (cur <= last) {
		months.push(new Date(cur));
		cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
	}
	return months
		.flatMap((ms) => splitMonthIntoFourWeeks(ms))
		.filter((b) => !(b.end < from || b.start > to));
}

// ---- aggregation ----
function sumIntoBuckets(txs: Tx[], buckets: Bucket[], kind: TxType): number[] {
	const rows = txs.map((t) => ({
		t: normTime(t.date),
		v: Number(t.amount) || 0,
		k: t.type
	}));
	return buckets.map((b) => {
		const s = normTime(b.start);
		const e = normTime(b.end);
		let sum = 0;
		for (const r of rows) if (r.k === kind && r.t >= s && r.t <= e) sum += r.v;
		return sum;
	});
}

// ================== Public API ==================
export function buildSeriesFromTransactions(txs: Tx[], input: BuildInput): BuildResult {
	let buckets: Bucket[] = [];

	if (input.kind === '7d') {
		const to = today();
		const from = addDays(to, -6);
		buckets = buildDailyBuckets(from, to);
		// prettier weekday labels for 7d
		buckets = buckets.map((b) => ({ ...b, label: fmtWeekday.format(b.start) }));
	} else if (input.kind === '30d') {
		const to = today();
		const from = addDays(to, -29);
		buckets = buildDailyBuckets(from, to);
	} else if (input.kind === '90d-weeklyByMonth') {
		buckets = build90dWeeklyByMonthBuckets();
	} else {
		// custom
		const from = startOfDay(new Date(input.from));
		let to = clampToToday(startOfDay(new Date(input.to)));
		if (to < from) to = new Date(from.getTime()); // enforce to >= from

		// Auto-detect granularity based on span (like the first file does)
		const span = daysBetween(from, to) + 1;
		let granularity = input.granularity || 'auto';
		
		if (granularity === 'auto') {
			// Same logic as makeRangeCategories in first file
			if (span <= 31) granularity = 'daily';
			else if (span <= 120) granularity = 'weeklyByMonth';
			else granularity = 'monthly';
		}

		if (granularity === 'daily') {
			buckets = buildDailyBuckets(from, to);
		} else if (granularity === 'monthly') {
			buckets = buildMonthlyBuckets(from, to);
		} else {
			// weeklyByMonth across the covered months
			const months: Date[] = [];
			let cur = new Date(from.getFullYear(), from.getMonth(), 1);
			const last = new Date(to.getFullYear(), to.getMonth(), 1);
			while (cur <= last) {
				months.push(new Date(cur));
				cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
			}
			buckets = months
				.flatMap((ms) => splitMonthIntoFourWeeks(ms))
				.filter((b) => !(b.end < from || b.start > to));
		}
	}

	const income = sumIntoBuckets(txs, buckets, 'INCOME');
	const expense = sumIntoBuckets(txs, buckets, 'EXPENSE');

	const series: AxisSeries = [
		{ name: 'Income', data: income, color: '#16a34a' },
		{ name: 'Expenses', data: expense, color: '#dc2626' }
	];
	console.log('inchart', series);

	const categories = buckets.map((b) => b.label);
	return { series, categories };
}