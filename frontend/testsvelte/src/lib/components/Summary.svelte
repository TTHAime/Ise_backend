<script lang="ts">
	import { Card, Popover } from 'flowbite-svelte';


	export let income  = 0;
	export let expense = 10000;


	$: remaining = income - expense;
	$: spentPct = income > 0 ? Math.min(100, Math.round((expense / income) * 100)) : 0;

	const fmt = (n: number) => n.toLocaleString();
</script>

<Card
	size="xl"
	class="relative mx-auto flex h-auto min-h-0 w-full max-w-2xl flex-col self-start p-4 pt-12 sm:p-6 sm:pt-14 md:p-8 md:pt-16"
>
	<!-- Floating title pill -->
	<div class="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/4">
		<div class="shadow-box mx-2 max-w-3xl rounded-lg bg-white px-4 py-3 sm:px-6 dark:bg-gray-800">
			<div class="flex items-center gap-2">
				<h1 class="text-xl font-bold text-gray-900 dark:text-white">Summary</h1>
			</div>
			<Popover
				class="shadow-xs z-10 w-72 rounded-lg border border-gray-200 bg-white text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400"
			>
				<div class="space-y-2 p-3">
					<h3 class="font-semibold text-gray-900 dark:text-white">Summary info</h3>
					<p>summary of expense,income and remaining</p>
				</div>
			</Popover>
		</div>
	</div>

	<!-- summary -->
	<div class="mt-1 space-y-4 sm:mt-6">
		<!-- total income -->
		<div class="shadow-box mx-2 max-w-3xl rounded-lg bg-white px-4 py-3 sm:px-6 dark:bg-gray-800">
			<div class="flex items-center justify-between gap-3">
				<h1 class="text-xl font-bold text-gray-900 dark:text-white">Total income</h1>
				<span
					class="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-2xl font-bold tabular-nums text-gray-900 ring-1 ring-gray-200 dark:bg-gray-700 dark:text-white dark:ring-gray-600"
				>
					{fmt(income)} Bath
				</span>
			</div>
		</div>

		<!-- total expense-->
		<div class="shadow-box mx-2 max-w-3xl rounded-lg bg-white px-4 py-3 sm:px-6 dark:bg-gray-800">
			<div class="flex items-center justify-between gap-3">
				<h1 class="text-xl font-bold text-gray-900 dark:text-white">Total expense</h1>
				<span
					class="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-2xl font-bold tabular-nums text-gray-900 ring-1 ring-gray-200 dark:bg-gray-700 dark:text-white dark:ring-gray-600"
				>
					{fmt(expense)} Bath
				</span>
			</div>
		</div>

		<!-- remaining -->
		<div class="shadow-box mx-2 max-w-3xl rounded-lg bg-white px-4 py-3 sm:px-6 dark:bg-gray-800">
			<div class="flex items-center justify-between gap-3">
				<h1 class="text-xl font-bold text-gray-900 dark:text-white">Remaining</h1>
				<span
					class="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-2xl font-bold tabular-nums text-gray-900 ring-1 ring-gray-200 dark:bg-gray-700 dark:text-white dark:ring-gray-600"
				>
					{fmt(remaining)} Bath
				</span>
			</div>
		</div>

		<!-- money use percentagas -->
		<div
			class="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-400"
		>
			<span>Used {spentPct}% of income</span>
			<span class="tabular-nums">{fmt(expense)} / {fmt(income)} Bath</span>
		</div>
		<div
			class="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
			role="progressbar"
			aria-valuenow={spentPct}
			aria-valuemin="0"
			aria-valuemax="100"
		>
			<div
				class="h-full rounded-full bg-emerald-500 motion-safe:transition-[width] motion-safe:duration-300 dark:bg-emerald-400"
				style={`width: ${spentPct}%`}
			></div>
		</div>
	</div>
</Card>
