<script lang="ts">
	import CompareLine from '$lib/components/Compare-line.svelte';
	import type { ApexAxisChartSeries } from 'apexcharts';
	import type { PeriodKey, Granularity } from '$lib/utils/Charttimehelpers';
	import { buildSeriesFromTransactions } from '$lib/utils/Chartseries';
	import type { Tx } from '$lib/utils/Chartseries';
	import { loadData, expenseSeries, incomeSeries } from '$lib/utils/stores';
	import { user } from '$lib/components/auth';
	import Report from '$lib/components/report.svelte';
	import {
		makeLast7Days,
		makeLast30Days,
		makeLast90DaysWeeklyByMonth,
		makeRangeCategories,
		validateRange
	} from '$lib/utils/Charttimehelpers';

	let loading = $state(true);
	let period: PeriodKey = $state('Last 7 days');
	let granularity = $state<Granularity>('daily');
	let series: ApexAxisChartSeries = $state([]);
	let categories: string[] = $state([]);

	let fromStr = $state('');
	let toStr = $state('');

	let totalIncome = $state(0);
	let totalExpenses = $state(0);

	let reportRef;
	let selectedMonth = 9;
	let selectedYear = 2025;
	function downloadPDF() {
		reportRef?.showPreviewModal();
	}

	const created = new Date($user.user.createdAt);
	const now = new Date();
	const createdYear = created.getFullYear();
	const createdMonth = created.getMonth() + 1;
	const currentYear = now.getFullYear();
	const currentMonth = now.getMonth() + 1;

	type RangeInput = '7d' | '30d' | '90d' | { from: string | Date; to: string | Date };

	// Helper functions
	const startOfDayLocal = (d: Date) => {
		const x = new Date(d);
		x.setHours(0, 0, 0, 0);
		return x;
	};

	const endOfDayLocal = (d: Date) => {
		const x = new Date(d);
		x.setHours(23, 59, 59, 999);
		return x;
	};

	const addDays = (d: Date, n: number) => {
		const x = new Date(d);
		x.setDate(x.getDate() + n);
		return x;
	};

	// Calculate totals from series data
	const sumData = (arr: any[]): number => {
		if (!Array.isArray(arr)) return 0;
		return arr.reduce((a, v) => {
			const num = typeof v === 'number' ? v : (v?.y ?? v?.value ?? 0);
			return a + (isNaN(num) ? 0 : num);
		}, 0);
	};

	const calculateTotals = (seriesData: ApexAxisChartSeries) => {
		if (!Array.isArray(seriesData)) {
			totalIncome = 0;
			totalExpenses = 0;
			return;
		}

		const incSeries = seriesData.find((s) => s.name === 'Income');
		const expSeries = seriesData.find((s) => s.name === 'Expenses');

		totalIncome = incSeries && Array.isArray(incSeries.data) ? sumData(incSeries.data) : 0;
		totalExpenses = expSeries && Array.isArray(expSeries.data) ? sumData(expSeries.data) : 0;
	};

	const startYear = Number.isNaN(created.getTime())
		? selectedYear // fallback: this year if createdAt invalid
		: Math.min(created.getFullYear(), selectedYear); // clamp if future

	const endYear = new Date().getFullYear();

	function validMonthsFor(year: number): number[] {
		let min = 1,
			max = 12;

		if (!Number.isNaN(created.getTime()) && year === createdYear) {
			min = createdMonth; // can’t pick months before account was created
		}
		if (year === currentYear) {
			max = currentMonth; // can’t pick months in the future
		}
		return Array.from({ length: max - min + 1 }, (_, i) => min + i);
	}

	const years: number[] = Array.from({ length: endYear - startYear + 1 }, (_, i) => endYear - i);

	// ensure default is in range
	if (!years.includes(selectedYear)) selectedYear = endYear;

	// Update totals whenever series changes
	$effect(() => {
		calculateTotals(series);
		const months = validMonthsFor(selectedYear);
		if (!months.includes(selectedMonth)) {
			selectedMonth = months[months.length - 1]; // snap to latest allowed month
		}
	});

	function resolveRange(input?: RangeInput): { from: Date; to: Date } {
		if (!input) input = '7d';

		const today = new Date();
		const to = endOfDayLocal(today);

		if (typeof input === 'string') {
			if (input === '7d') return { from: startOfDayLocal(addDays(today, -6)), to };
			if (input === '30d') return { from: startOfDayLocal(addDays(today, -29)), to };
			if (input === '90d') return { from: startOfDayLocal(addDays(today, -89)), to };
			throw new Error('Unknown range string. Use "7d" | "30d" | "90d".');
		}

		const from = startOfDayLocal(new Date(input.from));
		const toC = endOfDayLocal(new Date(input.to));
		if (Number.isNaN(from.getTime()) || Number.isNaN(toC.getTime()))
			throw new Error('Invalid custom dates. Use YYYY-MM-DD or Date objects.');
		return from <= toC ? { from, to: toC } : { from: toC, to: from };
	}

	async function getLineData(range?: RangeInput): Promise<Tx[]> {
		const { from, to } = resolveRange(range);
		await loadData(from, to);

		const src = $incomeSeries ?? [];
		const srcexp = $expenseSeries ?? [];

		const merged: Tx[] = [
			...src.map((r) => ({ amount: Number(r.amount) || 0, date: r.date, type: 'INCOME' as const })),
			...srcexp.map((r) => ({
				amount: Number(r.amount) || 0,
				date: r.date,
				type: 'EXPENSE' as const
			}))
		].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

		return merged;
	}

	async function fetchAnalytics(p: PeriodKey) {
		loading = true;
		period = p;

		try {
			if (p === 'Last 7 days') {
				const cats = makeLast7Days();
				categories = cats.labels;
				granularity = 'daily';
				const txData = await getLineData('7d');
				const result = buildSeriesFromTransactions(txData, { kind: '7d' });
				series = result.series;
				categories = result.categories;
			} else if (p === 'Last 30 days') {
				const cats = makeLast30Days('daily');
				categories = cats.labels;
				granularity = 'daily';
				const txData = await getLineData('30d');
				const result = buildSeriesFromTransactions(txData, { kind: '30d' });
				series = result.series;
				categories = result.categories;
			} else if (p === 'Last 90 days') {
				const cats = makeLast90DaysWeeklyByMonth();
				categories = cats.labels;
				granularity = 'weekly';
				const txData = await getLineData('90d');
				const result = buildSeriesFromTransactions(txData, { kind: '90d-weeklyByMonth' });
				series = result.series;
				categories = result.categories;
			}
		} catch (error) {
			console.error('Failed to fetch analytics:', error);
			series = [];
			categories = [];
		} finally {
			loading = false;
		}
	}

	async function fetchAnalyticsRange(fromISO: string, toISO: string) {
		try {
			const valid = validateRange({
				from: new Date(fromISO || Date.now()),
				to: new Date(toISO || Date.now())
			});

			fromStr = valid.from.toISOString().slice(0, 10);
			toStr = valid.to.toISOString().slice(0, 10);

			loading = true;
			period = 'Custom range';

			const txData = await getLineData({ from: valid.from, to: valid.to });
			const result = buildSeriesFromTransactions(txData, {
				kind: 'custom',
				from: fromStr,
				to: toStr,
				granularity: 'auto' // Let it auto-detect
			});

			series = result.series;
			categories = result.categories;
		} catch (error) {
			console.error('Failed to fetch custom range:', error);
			series = [];
			categories = [];
		} finally {
			loading = false;
		}
	}

	// Initial load
	fetchAnalytics('Last 7 days');
</script>

<!-- Controls -->
<div class="mb-4 flex flex-col items-center justify-center gap-3 py-5 md:flex-row md:gap-5">
	<!-- Segmented presets -->
	<div
		class="inline-flex h-10 items-center overflow-hidden rounded-xl border border-gray-200 bg-white px-1 shadow-sm dark:border-gray-700 dark:bg-gray-800"
	>
		<button
			class="h-8 rounded-lg px-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
			class:font-semibold={period === 'Last 7 days'}
			class:bg-gray-100={period === 'Last 7 days'}
			class:dark:bg-gray-700={period === 'Last 7 days'}
			onclick={() => fetchAnalytics('Last 7 days')}
		>
			7d
		</button>

		<div class="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700"></div>

		<button
			class="h-8 rounded-lg px-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
			class:font-semibold={period === 'Last 30 days'}
			class:bg-gray-100={period === 'Last 30 days'}
			class:dark:bg-gray-700={period === 'Last 30 days'}
			onclick={() => fetchAnalytics('Last 30 days')}
		>
			30d · Daily
		</button>

		<div class="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700"></div>

		<button
			class="h-8 rounded-lg px-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
			class:font-semibold={period === 'Last 90 days'}
			class:bg-gray-100={period === 'Last 90 days'}
			class:dark:bg-gray-700={period === 'Last 90 days'}
			onclick={() => fetchAnalytics('Last 90 days')}
		>
			90d · Quarterly
		</button>
	</div>

	<h1 class="mx-1 self-center text-lg font-bold text-gray-600 dark:text-gray-300">OR</h1>

	<!-- Custom range -->
	<div class="flex h-10 items-center gap-2">
		<div class="flex items-center gap-2">
			<label for="from-date" class="text-xs text-gray-500 dark:text-gray-400">From</label>
			<input
				id="from-date"
				type="date"
				bind:value={fromStr}
				max={new Date().toISOString().slice(0, 10)}
				class="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-800"
			/>
		</div>

		<div class="flex items-center gap-2">
			<label for="to-date" class="text-xs text-gray-500 dark:text-gray-400">To</label>
			<input
				id="to-date"
				type="date"
				bind:value={toStr}
				max={new Date().toISOString().slice(0, 10)}
				class="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm dark:border-gray-700 dark:bg-gray-800"
			/>
		</div>

		<button
			class="h-10 rounded-lg bg-gray-900 px-4 text-sm font-medium text-white hover:bg-black/85 disabled:opacity-50 dark:bg-white dark:text-gray-900"
			disabled={!fromStr || !toStr}
			onclick={() => fetchAnalyticsRange(fromStr, toStr)}
		>
			Apply
		</button>
	</div>
</div>

<!-- Chart -->
<div class="justify-center px-4 md:px-20">
	<CompareLine
		{series}
		{totalExpenses}
		{totalIncome}
		{categories}
		initialPeriod={period}
		currency="฿"
		{loading}
		onChangePeriod={(p) => {
			if (p === 'Last 7 days') fetchAnalytics('Last 7 days');
			else if (p === 'Last 30 days') fetchAnalytics('Last 30 days');
			else if (p === 'Last 90 days') fetchAnalytics('Last 90 days');
			else period = 'Custom range';
		}}
		onLoaded={() => console.log('Chart loaded')}
	/>
	<section class="space-y-4">
		<!-- Mount the component -->
		<Report bind:this={reportRef} bind:month={selectedMonth} bind:year={selectedYear} />

		<!-- Trigger PDF from parent -->
		<div class="pd-4 flex justify-center space-x-4 py-5">
			<select bind:value={selectedMonth} class="px-3 py-2">
				{#each validMonthsFor(selectedYear) as m}
					<option value={m}>{m}</option>
				{/each}
			</select>

			<select bind:value={selectedYear} class="rounded-md px-3 py-2">
				{#each years as y}
					<option value={y}>{y}</option>
				{/each}
			</select>
			<button class="button" onclick={downloadPDF}>
				<svg
					stroke-linejoin="round"
					stroke-linecap="round"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					viewBox="0 0 24 24"
					height="40"
					width="40"
					class="button__icon"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path fill="none" d="M0 0h24v24H0z" stroke="none"></path>
					<path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2"></path>
					<path d="M7 11l5 5l5 -5"></path>
					<path d="M12 4l0 12"></path>
				</svg>
				<span class="button__text">Get your Report</span>
			</button>
		</div>
	</section>
</div>
