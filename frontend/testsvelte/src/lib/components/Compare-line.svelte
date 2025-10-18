<script lang="ts">
	import type { ApexOptions, ApexAxisChartSeries } from 'apexcharts';
	import { Chart } from '@flowbite-svelte-plugins/chart';
	import { Card, A, Popover } from 'flowbite-svelte';
	import { InfoCircleSolid, ChevronRightOutline } from 'flowbite-svelte-icons';
	import { onMount } from 'svelte';

	// Props from parent
	export let series: ApexAxisChartSeries = [];
	export let categories: string[] | undefined = undefined;
	export let initialPeriod: string = 'Last 7 days';
	export let currency: string = '฿';
	export let loading: boolean = false;
	export let totalIncome: number = 0;
	export let totalExpenses: number = 0;

	// Typed callback props (Svelte 5 style)
	export let onChangePeriod: ((period: string) => void) | undefined;
	export let onLoaded: (() => void) | undefined;

	let period = initialPeriod;

	// Only render chart when data exists
	$: hasData =
		Array.isArray(series) &&
		series.length > 0 &&
		Array.isArray((series[0] as any)?.data) &&
		(series[0] as any).data.length > 0 &&
		!loading;

	const longestLen = (): number => {
		if (!Array.isArray(series)) return 0;
		return Math.max(...series.map((s: any) => (s?.data?.length ?? 0)), 0);
	};
	
	const fallbackCats = (n: number) => Array.from({ length: n }, (_, i) => `#${i + 1}`);

	$: options = hasData
		? ({
				chart: { 
					height: 220, 
					width: '100%', 
					type: 'line', 
					fontFamily: 'Inter, sans-serif', 
					dropShadow: { enabled: false }, 
					toolbar: { show: false } 
				},
				tooltip: { enabled: true, x: { show: false } },
				dataLabels: { enabled: false },
				stroke: { width: 4, curve: 'smooth' },
				grid: { 
					show: true, 
					strokeDashArray: 4, 
					padding: { left: 12, right: 12, top: -26 } 
				},
				series,
				legend: { show: false },
				xaxis: {
					categories: categories ?? fallbackCats(longestLen()),
					labels: { 
						show: true, 
						style: { 
							fontFamily: 'Inter, sans-serif', 
							cssClass: 'text-xs font-normal fill-gray-500 dark:fill-gray-400' 
						} 
					},
					axisBorder: { show: false },
					axisTicks: { show: false }
				},
				yaxis: { 
					show: true, 
					labels: { 
						style: { 
							cssClass: 'text-xs font-normal fill-gray-500 dark:text-gray-400' 
						} 
					} 
				}
			} satisfies ApexOptions)
		: undefined;

	// Safe formatter with validation
	const fmt = (n: number | undefined): string => {
		const num = typeof n === 'number' && !isNaN(n) ? n : 0;
		return `${currency}${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
	};

	function pickPeriod(p: string) {
		period = p;
		onChangePeriod?.(p);
	}

	let loadedEmitted = false;
	
	onMount(() => { 
		if (hasData && !loadedEmitted) { 
			loadedEmitted = true; 
			onLoaded?.(); 
		} 
	});
	
	$: if (hasData && !loadedEmitted) { 
		loadedEmitted = true; 
		onLoaded?.(); 
	}
</script>

<Card class="p-4 md:p-6" size="xl">
	<div class="mb-5 flex justify-between">
		<div class="grid grid-cols-2 gap-4">
			<div>
				<h5 class="mb-2 inline-flex items-center font-normal leading-none text-gray-500 dark:text-gray-400">
					Income
					<InfoCircleSolid 
						id="i1" 
						class="ms-1 h-3 w-3 cursor-pointer text-gray-400 hover:text-gray-900 dark:hover:text-white" 
					/>
					<Popover 
						triggeredBy="#i1" 
						class="shadow-xs z-10 w-72 rounded-lg border border-gray-200 bg-white text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400"
					>
						<div class="space-y-2 p-3">
							<h3 class="font-semibold text-gray-900 dark:text-white">Income Overview</h3>
							<p>Shows how much you earned during the selected period.</p>
							<A href="/">
								Read more 
								<ChevronRightOutline class="ms-1.5 h-2 w-2" />
							</A>
						</div>
					</Popover>
				</h5>
				<p class="text-2xl font-bold leading-none text-gray-900 dark:text-white">
					{fmt(totalIncome)}
				</p>
			</div>

			<div>
				<h5 class="mb-2 inline-flex items-center font-normal leading-none text-gray-500 dark:text-gray-400">
					Expenses
					<InfoCircleSolid 
						id="i2" 
						class="ms-1 h-3 w-3 cursor-pointer text-gray-400 hover:text-gray-900 dark:hover:text-white" 
					/>
					<Popover 
						triggeredBy="#i2" 
						class="shadow-xs z-10 w-72 rounded-lg border border-gray-200 bg-white text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400"
					>
						<div class="space-y-2 p-3">
							<h3 class="font-semibold text-gray-900 dark:text-white">Expense Overview</h3>
							<p>Shows how much you spent during the selected period.</p>
							<A href="/">
								Read more 
								<ChevronRightOutline class="ms-1.5 h-2 w-2" />
							</A>
						</div>
					</Popover>
				</h5>
				<p class="text-2xl font-bold leading-none text-gray-900 dark:text-white">
					{fmt(totalExpenses)}
				</p>
			</div>
		</div>
	</div>

	<!-- Full-width chart area -->
	<div class="-mx-4 md:-mx-6 px-2 sm:px-3 md:px-4">
		{#if hasData && options}
			<Chart {options} class="w-full" />
		{:else}
			<div class="h-[220px] w-full animate-pulse rounded-md bg-gray-100 dark:bg-gray-800"></div>
		{/if}
	</div>
</Card>