<script lang="ts">
	import ChartCard from '$lib/components/Compare-line.svelte';
	import type { ApexAxisChartSeries } from 'apexcharts';
	import type { PeriodKey, Granularity } from '$lib/utils/Charttimehelpers';
	import { buildSeriesFromTransactions } from '$lib/utils/Chartseries';
	import type { Tx } from '$lib/utils/Chartseries';
	import { loadData, expenseSeries, incomeSeries } from '$lib/utils/stores';
	import {
		makeLast7Days,
		makeLast30Days,
		makeLast90DaysWeeklyByMonth,
		makeRangeCategories,
		validateRange
	} from '$lib/utils/Charttimehelpers';

	let loading = true;
	let period: PeriodKey = 'Last 7 days';
	let granularity: Granularity | undefined = 'daily';
	let series: ApexAxisChartSeries = [];
	let categories: string[] = [];

	let fromStr = '';
	let toStr = '';

	// inside a Svelte component (so $store works)
	async function getLineData(len?: number): Promise<Tx[]> {
		await loadData('2025-08-01', '2025-10-08');
		const src = $incomeSeries ?? [];
		const srcexp = $expenseSeries ?? [];
		const take = typeof len === 'number' ? Math.min(len, src.length) : src.length;
		const takexp = typeof len === 'number' ? Math.min(len, srcexp.length) : srcexp.length;

		const txs: Tx[] = src.slice(0, take).map((r) => ({
			amount: Number(r.amount) || 0,
			date: r.date, // keep API date; or new Date(r.date).toISOString()
			type: 'INCOME'
		}));
		const txsexp: Tx[] = srcexp.slice(0, takexp).map((r) => ({
			amount: Number(r.amount) || 0,
			date: r.date, // keep API date; or new Date(r.date).toISOString()
			type: 'EXPENSE'
		}));

		return txs.concat(txsexp);
	}

	function demoSeries(len: number) {
		const income = Array.from({ length: len }, (_, i) => 1200 + i * 22 + (i % 3) * 40);
		const expense = Array.from({ length: len }, (_, i) => 800 + i * 17 + (i % 4) * 30);
		return [
			{ name: 'Income', data: income, color: '#16a34a' },
			{ name: 'Expenses', data: expense, color: '#dc2626' }
		] as ApexAxisChartSeries;
	}

	async function fetchAnalytics(p: PeriodKey) {
		loading = true;
		period = p;

		if (p === 'Last 7 days') {
			const cats = makeLast7Days();
			categories = cats.labels;
			granularity = 'daily';
			const txData = await getLineData();
			series = buildSeriesFromTransactions(txData, { kind: '7d' }).series;
			console.log('yay', series);
		} else if (p === 'Last 30 days') {
			const cats = makeLast30Days('daily');
			categories = cats.labels;
			granularity = 'daily';
			const txData = await getLineData();
			series = buildSeriesFromTransactions(txData, { kind: '30d' }).series;
		} else if (p === 'Last 90 days') {
			const cats = makeLast90DaysWeeklyByMonth();
			categories = cats.labels;
			granularity = 'weekly';
			const txData = await getLineData();
			series = buildSeriesFromTransactions(txData, { kind: '90d-weeklyByMonth' }).series;
		} else {
			loading = false;
			return;
		}

		loading = false;
	}

	async function fetchAnalyticsRange(fromISO: string, toISO: string, g?: Granularity) {
		const valid = validateRange({
			from: new Date(fromISO || Date.now()),
			to: new Date(toISO || Date.now())
		});
		fromStr = valid.from.toISOString().slice(0, 10);
		toStr = valid.to.toISOString().slice(0, 10);
        console.log(fromStr)
		loading = true;
		period = 'Custom range';
		granularity = 'daily';

		const cats = makeRangeCategories(valid, g);
		const txData = await getLineData();
		let tmi = buildSeriesFromTransactions(txData, {
            kind: 'custom',
			from: fromStr,
			to: toStr,
			granularity: 'weeklyByMonth'
		});
        series = tmi.series;
        console.log('cars',series)
        categories = cats.labels;
		loading = false;
	}

	// initial
	fetchAnalytics('Last 7 days');
</script>

<!-- Controls (centered & vertically aligned) -->
<div class="mb-4 flex flex-col items-center justify-center gap-3 py-5 md:flex-row md:gap-5">
	<!-- Segmented presets -->
	<div
		class="inline-flex h-10 items-center overflow-hidden rounded-xl border border-gray-200 bg-white px-1 shadow-sm dark:border-gray-700 dark:bg-gray-800"
	>
		<button
			class="h-8 rounded-lg px-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
			class:font-semibold={period === 'Last 7 days'}
			on:click={() => fetchAnalytics('Last 7 days')}>7d</button
		>

		<div class="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700"></div>

		<button
			class="h-8 rounded-lg px-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
			class:font-semibold={period === 'Last 30 days'}
			on:click={() => fetchAnalytics('Last 30 days')}>30d · Daily</button
		>

		<div class="mx-1 h-5 w-px bg-gray-200 dark:bg-gray-700"></div>

		<button
			class="h-8 rounded-lg px-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
			class:font-semibold={period === 'Last 90 days' && granularity === 'weekly'}
			on:click={() => fetchAnalytics('Last 90 days')}>90d · Quarterly</button
		>
	</div>

	<h1 class="mx-1 self-center text-lg font-bold text-gray-600 dark:text-gray-300">OR</h1>

	<!-- Custom range (inputs + Apply) -->
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
			class="h-10 rounded-lg bg-gray-900 px-4 text-sm font-medium text-white hover:bg-black/85 dark:bg-white dark:text-gray-900"
			on:click={() =>
				fetchAnalyticsRange(
					fromStr || toStr || new Date().toISOString().slice(0, 10),
					toStr || fromStr || new Date().toISOString().slice(0, 10)
				)}
		>
			Apply
		</button>
	</div>
</div>
<div class="px-20">
	<ChartCard
		{series}
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
		onLoaded={() => {}}
	/>
</div>
