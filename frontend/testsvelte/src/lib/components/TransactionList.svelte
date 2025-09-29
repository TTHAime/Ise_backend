<script lang="ts">
	type ApiTxn = {
		id: string | number;
		amount: number;
		type: 'INCOME' | 'EXPENSE' | string;
		date: string | Date;
		categoryId?: string | null;
		categoryName?: string | null;
		description?: string | null;
	};

	type Category = {
		id: string;
		name: string;
		color?: string;
		icon?: string;
		type?: 'INCOME' | 'EXPENSE';
	};

	let {
		recentdata = undefined as ApiTxn[] | undefined,
		categories = undefined as Category[] | { categories: Category[] } | undefined,
		categoriesSet = undefined as { categories: Category[] } | undefined,
		CategoriesSet = undefined as { categories: Category[] } | undefined,

		onAdd = undefined as undefined | (() => void),
		onItemClick = undefined as undefined | ((t: Txn) => void)
	} = $props<{
		recentdata?: ApiTxn[];
		transactions?: ApiTxn[];
		items?: ApiTxn[];
		categories?: Category[] | { categories: Category[] };
		categoriesSet?: { categories: Category[] };
		CategoriesSet?: { categories: Category[] };
		onAdd?: () => void;
		onItemClick?: (t: Txn) => void;
	}>();

	const raw = $derived(recentdata ?? []);

	const pickCats = (src: unknown): Category[] =>
		Array.isArray(src)
			? src
			: Array.isArray((src as any)?.categories)
				? (src as any).categories
				: [];

	const catList = $derived(
		(() => {
			const a = pickCats(categories);
			if (a.length) return a;
			const b = pickCats(categoriesSet);
			if (b.length) return b;
			return pickCats(CategoriesSet);
		})()
	);

	const catById = $derived(new Map(catList.map((c) => [String(c.id), c])));
	const catByName = $derived(new Map(catList.map((c) => [String(c.name).toLowerCase(), c])));

	const parseDate = (d: unknown): Date => {
		if (d instanceof Date) return d;
		const dt = new Date(String(d));
		return isNaN(dt.getTime()) ? new Date() : dt;
	};

	// Resolve a category record (for icon/color) using id, then name, else generic by type
	const resolveCategory = (x: ApiTxn): Category | undefined => {
		// 1) by id
		if (x.categoryId) {
			const byId = catById.get(String(x.categoryId));
			if (byId) return byId;
		}
		// 2) by name (case-insensitive)
		const name = (x.categoryName ?? '').trim().toLowerCase();
		if (name) {
			const byName = catByName.get(name);
			if (byName) return byName;
		}
		// 3) generic by type
		const t = String(x.type || '').toUpperCase() === 'INCOME' ? 'INCOME' : 'EXPENSE';
		return t === 'INCOME'
			? { id: 'income', name: 'Income', color: '#16a34a', icon: '💰', type: 'INCOME' }
			: { id: 'expense', name: 'Expense', color: '#ef4444', icon: '🧾', type: 'EXPENSE' };
	};

	type Txn = {
		id: string | number;
		date: Date;
		category: string; // display name
		note: string;
		amount: number; // sign (+ income / - expense)
		color?: string;
		icon?: string;
	};

	const toTxn = (x: ApiTxn): Txn => {
		const t = String(x.type || '').toUpperCase();
		const amt = Math.abs(Number(x.amount) || 0);
		const signed = t === 'INCOME' ? amt : -amt;

		const cat = resolveCategory(x);

		const displayName =
			(x.categoryName && x.categoryName.trim()) ||
			cat?.name ||
			(t === 'INCOME' ? 'Income' : 'Expense');

		return {
			id: x.id,
			date: parseDate(x.date),
			category: displayName,
			note: x.description ?? '',
			amount: signed,
			color: cat?.color,
			icon: cat?.icon ?? (t === 'INCOME' ? '💰' : '🧾') // icon from categories; fallback by type
		};
	};

	const txns = $derived(raw.map(toTxn));
	const isEmpty = $derived(txns.length === 0);

	const dayKey = (d: Date) =>
		`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	const dayLabel = (d: Date) =>
		d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

	const groups = $derived(
		(() => {
			const map = new Map<string, { key: string; label: string; items: Txn[] }>();
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

	// THB suffix
	const fmtAmount = (n: number) => {
		const sign = n >= 0 ? '+' : '-';
		const num = new Intl.NumberFormat('en-GB', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(Math.abs(n));
		return `${sign}${num} THB`;
	};
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
				onclick={() => onAdd?.()}
			>
				+ Add Transaction
			</button>
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
						<li>
							<button
								type="button"
								onclick={() => onItemClick?.(t)}
								class="group w-full cursor-pointer rounded-xl px-3 py-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.99]"
								class:hover:bg-emerald-50={t.amount > 0}
								class:hover:bg-rose-50={t.amount < 0}
								class:focus-visible:ring-emerald-400={t.amount > 0}
								class:focus-visible:ring-rose-400={t.amount < 0}
								aria-label={`Open ${t.category} ${t.amount >= 0 ? 'income' : 'expense'} transaction`}
							>
								<!-- LEFT -->
								<div class="flex w-full items-start justify-between gap-3">
									<!-- Left cluster -->
									<div class="flex min-w-0 flex-1 items-start gap-3">
										<span
											class="inline-block h-5 w-5 rounded-full ring-1 ring-black/5 transition group-hover:scale-110"
											style={t.color ? `background:${t.color}` : ''}
											class:bg-green-400={!t.color && t.amount > 0}
											class:bg-red-500={!t.color && t.amount < 0}
											aria-hidden="true"
										></span>

										<!-- text block  -->
										<div class="min-w-0 text-left">
											<div
												class="flex items-center gap-2 truncate text-base font-semibold text-gray-900"
											>
												{#if t.icon}
													<span aria-hidden="true" class="transition group-hover:-translate-y-px"
														>{t.icon}</span
													>
												{/if}
												<span class="truncate">{t.category}</span>
											</div>
											{#if t.note}
												<div class="mt-0.5 truncate text-sm text-gray-500">{t.note}</div>
											{/if}
										</div>
									</div>

									<!-- Right -->
									<div class="ml-2 flex shrink-0 items-center gap-2">
										<span
											class="text-base font-semibold transition group-hover:brightness-110"
											class:text-emerald-600={t.amount > 0}
											class:text-rose-600={t.amount < 0}
										>
											{fmtAmount(t.amount)}
										</span>
										<svg
											class="size-5 -translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100"
											viewBox="0 0 20 20"
											fill="currentColor"
											aria-hidden="true"
											class:text-emerald-500={t.amount > 0}
											class:text-rose-500={t.amount < 0}
										>
											<path d="M7.5 5.5l5 4.5-5 4.5" />
										</svg>
									</div>
								</div>
							</button>
						</li>
					{/each}
				</ul>
			</section>
		{/each}
	</div>
{/if}
