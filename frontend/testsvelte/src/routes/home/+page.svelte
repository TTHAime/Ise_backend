<script lang="ts">
	import TransactionList from '$lib/components/Translist.svelte';
	import Summary from '$lib/components/Summary.svelte';
	import CompareCard from '$lib/components/Compare-line.svelte';
	import Piechart from '$lib/components/Piechart.svelte';
	import type { ApexOptions } from 'apexcharts';
	import { refreshUser } from '$lib/components/auth';
	import { onMount } from 'svelte';
	import {
		incomeSeries,
		expenseSeries,
		Totalincome,
		Totalexpense,
		Dashboard,
		loadAll,
	} from '$lib/utils/stores';

	async function load() {
		// data = loadData(new Date(2025, 9, 13)); //y m d ? month little error
		// await loadAll();
	}

	// onMount(() => {// alredy load in effect
	// 	refreshUser();
	// 	load();
	// 	// data = loadData(new Date(2025, 9, 13)); //y m d ? month little error
	// });

	function toColors(arr: Array<{ category?: { color?: string } }>): string[] {
		let colors: string[] = [];
		colors = arr.map((e) => e?.category?.color ?? '#999999'); // fallback color
		// console.log(colors);
		return colors;
	}

	const toSeries = (arr: any[]) =>
		arr.map((t) => Number(t.amount)).map((n) => (Number.isFinite(n) ? Math.abs(n) : 0));

	function toLabels(arr: any[]) {
		let labels: string[] = [];
		labels = arr.map((e: { category: { name: any } }) => e?.category?.name ?? 'idk'); // fallback color
		// console.log('labels', labels);
		return labels;
	}

	// Input: parallel arrays of equal length
	// Output: deduped arrays aligned by unique label (first occurrence order)
	function bucketsAll(
		seriesIn: number[],
		colorsIn: string[],
		labelsIn: string[]
	): { series: number[]; colors: string[]; labels: string[] } {
		// Align lengths just in case
		const n = Math.min(seriesIn.length, colorsIn.length, labelsIn.length);

		// Use a Map to preserve insertion order (first occurrence wins for color)
		const acc = new Map<string, { sum: number; color: string }>();

		for (let i = 0; i < n; i++) {
			const lbl = labelsIn[i] ?? 'idk';
			const valRaw = seriesIn[i];
			const val = Number.isFinite(valRaw) ? Math.abs(Number(valRaw)) : 0;
			const col = colorsIn[i] ?? '#999999';

			if (!acc.has(lbl)) {
				acc.set(lbl, { sum: val, color: col });
			} else {
				const cur = acc.get(lbl)!;
				cur.sum += val; // keep first color
			}
		}

		// Unpack in insertion order
		const labels: string[] = [];
		const series: number[] = [];
		const colors: string[] = [];

		for (const [lbl, { sum, color }] of acc.entries()) {
			labels.push(lbl);
			series.push(sum);
			colors.push(color);
		}

		return { series, colors, labels };
	}
	// 1) gate rendering
	let ready = $state(false);
	$effect(() => {
		(async () => {
			await refreshUser();
			await loadAll();
		})();
	});

	const incseries = toSeries($incomeSeries);
	const inccolors = toColors($incomeSeries);
	const inclabels = toLabels($incomeSeries);
	const incgrouped = bucketsAll(incseries, inccolors, inclabels);
	const expseries = toSeries($expenseSeries);
	const expcolors = toColors($expenseSeries);
	const explabels = toLabels($expenseSeries);
	const expgrouped = bucketsAll(expseries, expcolors, explabels);

	const pieCommon: ApexOptions = {
		chart: {
			type: 'pie',
			width: '120%',
			height: '120%'
		},
		stroke: { colors: ['#ffffff'] },
		plotOptions: { pie: { dataLabels: { offset: -25 } } },
		// tweak labels on small screens
		responsive: [
			{ breakpoint: 768, options: { plotOptions: { pie: { dataLabels: { offset: -15 } } } } }
		]
	};
	const expenseOptions: ApexOptions = {
		...pieCommon,
		series: expgrouped.series,
		colors: expgrouped.colors,
		labels: expgrouped.labels
	};
	const incomeOptions: ApexOptions = {
		...pieCommon,
		series: incgrouped.series,
		colors: incgrouped.colors,
		labels: incgrouped.labels
	};
	ready = true; // now show the page
</script>

{#if !ready}
	<div
		class="fixed inset-0 grid place-items-center"
		role="status"
		aria-live="polite"
		aria-label="Loading"
	>
		<div class="flex flex-col items-center">
			<!-- halo -->
			<div class="relative">
				<div
					class="size-28 animate-ping rounded-full bg-emerald-400/20 motion-reduce:animate-none"
				></div>
				<!-- spinner -->
				<div class="absolute inset-0 grid place-items-center">
					<div
						class="size-12 animate-spin rounded-full border-4 border-emerald-500/30 border-t-emerald-500 motion-reduce:animate-none"
					></div>
				</div>
			</div>

			<!-- text -->
			<p class="mt-6 text-sm font-medium text-emerald-700 dark:text-emerald-300">
				Loading your dashboard…
			</p>
		</div>
	</div>
{:else}
	<div class="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-8 drop-shadow-lg md:grid-cols-2">
		<Piechart
			title="Expense"
			description="This chart shows where your money goes each month."
			options={expenseOptions}
		/>
		<Piechart
			title="Income"
			description="This chart shows your different sources of income."
			options={incomeOptions}
		/>
		<TransactionList data={$Dashboard.data} />
		<Summary expense={$Totalexpense} income={$Totalincome} />
	</div>
{/if}
