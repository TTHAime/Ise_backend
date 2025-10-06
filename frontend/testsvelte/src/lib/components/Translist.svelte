<script lang="ts">
	import { Card, Popover, A } from 'flowbite-svelte';

	type TxType = 'INCOME' | 'EXPENSE';
	type RecentTxn = {
		id: string;
		amount: number | string;
		type: TxType;
		date: string; // ISO
		description: string;
		categoryName?: string;
		categoryIcon?: string;
		categoryColor?: string;
	};

	export let maxHeight = '16rem';

	export let data: {
		title?: string;
		recentTransactions: RecentTxn[];
	} = { title: 'Recent Transactions', recentTransactions: [] };

	const amountNum = (v: number | string) => {
		const n = Number(v);
		return Number.isFinite(n) ? n : 0;
	};

	const amountText = (amt: number | string, type: TxType) => {
		const n = amountNum(amt);
		const sign = type === 'EXPENSE' ? '-' : '+';
		return `${sign}${n.toFixed(2)} Baht`;
	};

	const amountClass = (type: TxType) =>
		type === 'EXPENSE'
			? 'text-red-600 dark:text-red-400'
			: 'text-emerald-600 dark:text-emerald-400';

	const iconFor = (t: RecentTxn) => t.categoryIcon ?? (t.type === 'INCOME' ? '💸' : '🧾');

	const colorFor = (t: RecentTxn) => t.categoryColor ?? '#E5E7EB'; // fallback gray-200

	const formatDate = (iso: string) => {
		const d = new Date(iso);
		// fallback if invalid
		if (isNaN(d.getTime())) return iso;
		return d.toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: '2-digit'
		});
	};
</script>

<Card
	size="xl"
	class="relative mx-auto flex w-full max-w-2xl flex-col p-4 pt-12 sm:p-6 sm:pt-14 md:p-8 md:pt-16"
>
	<!-- Floating title pill -->
	<div class="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/4">
		<div class="shadow-box mx-2 max-w-3xl rounded-lg bg-white px-4 py-3 sm:px-6 dark:bg-gray-800">
			<div class="flex items-center gap-2">
				<h1 class="text-xl font-bold text-gray-900 dark:text-white">
					{data.title ?? 'Recent Transactions'}
				</h1>
			</div>
			<Popover
				class="shadow-xs z-10 w-72 rounded-lg border border-gray-200 bg-white text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400"
			>
				<div class="space-y-2 p-3">
					<h3 class="font-semibold text-gray-900 dark:text-white">Transaction info</h3>
					<p>Shows the latest income and expense records from your account.</p>
				</div>
			</Popover>
		</div>
	</div>

	<!-- Scrollable List / Empty state -->
	<div
		class="mt-1 overflow-y-auto overscroll-contain pr-2 sm:mt-6"
		style={`max-height:${maxHeight};scrollbar-gutter:stable;`}
		aria-label="Recent transactions"
	>
		{#if data.recentTransactions?.length}
			<ul class="divide-y divide-gray-200 dark:divide-gray-700">
				{#each data.recentTransactions as item (item.id)}
					<li
						class="flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-900/40"
						style={`--cat:${colorFor(item)};`}
					>
						<div class="flex min-w-0 items-center gap-3">
							<!-- colored avatar with icon -->
							<span
								class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-base ring-1 dark:bg-gray-800"
								style="color: var(--cat); border-color: var(--cat);"
								aria-hidden="true"
								title={item.categoryName ?? item.type}
							>
								{iconFor(item)}
							</span>

							<div class="min-w-0">
								<p class="truncate text-sm font-medium text-gray-900 dark:text-white">
									{item.description}
								</p>
								<p class="text-xs text-gray-500 dark:text-gray-400">
									{formatDate(item.date)}
									{#if item.categoryName}
										· <span class="truncate align-middle">{item.categoryName}</span>
									{/if}
								</p>
							</div>
						</div>

						<div class={'shrink-0 text-sm font-semibold ' + amountClass(item.type)}>
							{amountText(item.amount, item.type)}
						</div>
					</li>
				{/each}
			</ul>
		{:else}
			<div
				class="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 p-6 text-center dark:border-gray-700"
				aria-live="polite"
			>
				<div class="text-3xl">🗒️</div>
				<p class="text-sm font-medium text-gray-900 dark:text-white">No transactions yet</p>
				<p class="text-xs text-gray-500 dark:text-gray-400">
					Add an income or expense to see it here.
				</p>
				<A
					href="/Transaction"
					class="group inline-flex items-center text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
					aria-label="Add a transaction"
				>
					Add transaction
				</A>
			</div>
		{/if}
	</div>
</Card>

<style>
	:global(.overflow-y-auto::-webkit-scrollbar) {
		width: 8px;
	}
	:global(.overflow-y-auto::-webkit-scrollbar-track) {
		background: transparent;
	}
	:global(.overflow-y-auto::-webkit-scrollbar-thumb) {
		background: rgba(100, 100, 100, 0.35);
		border-radius: 8px;
	}
	:global(.overflow-y-auto:hover::-webkit-scrollbar-thumb) {
		background: rgba(100, 100, 100, 0.55);
	}
	/* Firefox */
	:global(.overflow-y-auto) {
		scrollbar-width: thin;
		scrollbar-color: rgba(100, 100, 100, 0.35) transparent;
	}
</style>
