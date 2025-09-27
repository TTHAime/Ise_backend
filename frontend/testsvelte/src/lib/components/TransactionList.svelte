<script lang="ts">
	type ApiTxn = {
		id: string | number;
		amount: number;
		type: 'INCOME' | 'EXPENSE' | string;
		date: string | Date;
		categoryName?: string | null;
		description?: string | null;
	};

	type Txn = { id: string | number; date: Date; category: string; note: string; amount: number };
	type Group = { key: string; label: string; items: Txn[] };

	let {
		recentdata = undefined as ApiTxn[] | undefined,
		onAdd = undefined as undefined | (() => void)
	} = $props<{
		recentdata?: ApiTxn[];
		transactions?: ApiTxn[];
		items?: ApiTxn[];
		onAdd?: () => void;
	}>();

	const raw = $derived(recentdata ?? []);

	$effect(() => {
		console.log('raw length:', raw.length, raw[0]);
	});

	const parseDate = (d: unknown): Date => {
		if (d instanceof Date) return d;
		const dt = new Date(String(d));
		return isNaN(dt.getTime()) ? new Date() : dt; // fallback to "now" instead of dropping the row
	};

	const toTxn = (x: ApiTxn): Txn => {
		const t = String(x.type || '').toUpperCase();
		const amt = Number(x.amount) || 0;
		const signed = t === 'INCOME' ? Math.abs(amt) : -Math.abs(amt);
		const cat = x.categoryName && x.categoryName !== '_' ? x.categoryName : t === 'INCOME' ? 'Income' : 'Expense';
		return {
			id: x.id,
			date: parseDate(x.date),
			category: cat,
			note: x.description ?? 'note changee',
			amount: signed
		};
	};

	const txns = $derived(raw.map(toTxn));
	const isEmpty = $derived(txns.length === 0);

	const dayKey = (d: Date) => {
		const y = d.getFullYear(),
			m = String(d.getMonth() + 1).padStart(2, '0'),
			day = String(d.getDate()).padStart(2, '0');
		return `${y}-${m}-${day}`;
	};
	const dayLabel = (d: Date) =>
		d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

	const groups = $derived(
		(() => {
			const map = new Map<string, Group>();
			for (const t of txns) {
				const k = dayKey(t.date);
				let g = map.get(k);
				if (!g) {
					g = { key: k, label: dayLabel(t.date), items: [] };
					map.set(k, g);
				}
				g.items.push(t);
			}
			return Array.from(map.values())
				.sort((a, b) => (a.key < b.key ? 1 : -1))
				.map((g) => ({ ...g, items: g.items.sort((a, b) => b.date.getTime() - a.date.getTime()) }));
		})()
	);

	const fmtAmount = (n: number) =>
		(n >= 0 ? '+' : '-') +
		new Intl.NumberFormat('en-GB', {
			style: 'currency',
			currency: 'THB',//chage later na
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		})
			.format(Math.abs(n))
			.replace(/\u00A0/g, ' ');
</script>

{#if isEmpty}
	<div
		class="mx-auto w-[90%] rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center md:w-[80%] lg:w-[90%]"
	>
		<div
			class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full ring-1 ring-gray-200"
		>
			📭
		</div>
		<h3 class="text-lg font-semibold text-gray-800">No transactions yet</h3>
		<p class="mt-1 text-sm text-gray-500">It's empty — please add a transaction to see it here.</p>
		{#if onAdd}
			<button
				class="mt-4 rounded-xl bg-emerald-500 px-4 py-2 font-medium text-white hover:brightness-110 active:scale-95"
				onclick={() => onAdd?.()}>+ Add Transaction</button
			>
		{/if}
	</div>
{:else}
	<div
		class="shadow-box mx-auto w-[90%] rounded-2xl border border-gray-200 bg-white p-0 md:w-[80%] lg:w-[90%]"
	>
		{#each groups as g (g.key)}
			<section class="mb-2 last:mb-0">
				<h3
					class="sticky top-0 z-10 bg-white/80 px-4 py-3 text-lg font-semibold text-gray-900 backdrop-blur"
				>
					{g.label}
				</h3>
				<ul class="divide-y divide-gray-100 px-4">
					{#each g.items as t (t.id)}
						<li class="flex items-center gap-3 py-3">
							<span
								class="inline-block h-5 w-5 rounded-full"
								class:bg-green-400={t.amount > 0}
								class:bg-red-500={t.amount < 0}
							></span>
							<div class="min-w-0 flex-1">
								<div class="truncate text-base font-medium text-gray-800">{t.category}</div>
								{#if t.note}<div class="truncate text-sm text-gray-500">{t.note}</div>{/if}
							</div>
							<div
								class="ml-2 shrink-0 text-right text-base font-semibold"
								class:text-green-500={t.amount > 0}
								class:text-red-500={t.amount < 0}
							>
								{fmtAmount(t.amount)}
							</div>
						</li>
					{/each}
				</ul>
			</section>
		{/each}
	</div>
{/if}
