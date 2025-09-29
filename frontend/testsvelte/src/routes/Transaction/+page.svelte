<script lang="ts">
	import AddTransaction from '$lib/components/AddTransaction.svelte';
	import TransactionCard from '$lib/components/TransactionCard.svelte';
	import TransList from '$lib/components/TransactionList.svelte';
	import { onMount } from 'svelte';
	const symbolLeft = '<';
	const symbolRight = '>';
	let label = $state('Date');

	type Category = {
		id: string;
		name: string;
		color?: string; // e.g. "#FDA7DF"
		icon?: string; // e.g. "📄"
		type?: 'INCOME' | 'EXPENSE';
	};

	let categories = $state<Category[]>([
		//default hard code pap
		{ id: 'food', name: 'Food & Dining', color: '#FF6B6B', icon: '🍽️', type: 'EXPENSE' },
		{ id: 'rent', name: 'Rent', color: '#A78BFA', icon: '🏠', type: 'EXPENSE' },
		{ id: 'utilities', name: 'Bills & Utilities', color: '#FDA7DF', icon: '🧾', type: 'EXPENSE' },
		{ id: 'entertainment', name: 'Entertainment', color: '#96CEB4', icon: '🎬', type: 'EXPENSE' },
		{ id: 'transport', name: 'Transportation', color: '#4ECDC4', icon: '🚗', type: 'EXPENSE' },
		{ id: 'health', name: 'Healthcare', color: '#FFEAA7', icon: '🏥', type: 'EXPENSE' },
		{ id: 'shopping', name: 'Shopping', color: '#45B7D1', icon: '🛍️', type: 'EXPENSE' },
		{ id: 'travel', name: 'Travel', color: '#74B9FF', icon: '✈️', type: 'EXPENSE' },
		// income examples (optional)
		{ id: 'salary', name: 'Salary', color: '#16A34A', icon: '💰', type: 'INCOME' },
		{ id: 'other-income', name: 'Other Income', color: '#22C55E', icon: '+', type: 'INCOME' }
	]);

	let Addshow = $state(false);
	let editTxn: import('$lib/components/AddTransaction.svelte').EditTxn | null = $state(null);

	function openAdd() {
		editTxn = null;
		Addshow = true;
	}

	function openEdit(t: {
		id: string | number;
		date: string | Date;
		category: string;
		note?: string;
		amount: number;
	}) {
		editTxn = {
			id: t.id,
			type: t.amount >= 0 ? 'INCOME' : 'EXPENSE',
			categoryId: t.category,
			date: typeof t.date === 'string' ? t.date : t.date.toISOString(),
			note: t.note ?? '',
			amount: Math.abs(t.amount),
			currency: 'THB'
		};
		Addshow = true;
	}

	//maybe use this in submit change mode smt
	async function SubmitTransaction(p) {
		const method = p.id ? 'PATCH' : 'POST';
		const url = p.id
			? 'http://localhost:4000/transaction/'.concat(p.id) // up
			: 'http://localhost:4000/transaction'; // add
		const body = {
			amount: p.amount,
			description: p.note,
			type: p.type,
			date: p.date,
			categoryId: p.category
		};

		const res = await fetch(url, {
			method,
			credentials: 'include',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});

		if (!res.ok) {
			const msg = await res.text();
			throw new Error('${method} ${url} failed: ${msg}');
		}

		// close & clear
		Addshow = false;
		editTxn = null;
	}

	const asCategoryArray = (x: unknown): Category[] => {
		if (Array.isArray(x)) return x as Category[];
		if (x && typeof x === 'object') {
			const obj = x as any;
			if (Array.isArray(obj.data)) return obj.data as Category[];
			if (Array.isArray(obj.categories)) return obj.categories as Category[];
		}
		return []; // fallback
	};

	const dedupeById = (arr: Category[]) =>
		Array.from(new Map(arr.map((c) => [String(c.id), c])).values());

	async function loadCategories() {
		const [expRes, incRes] = await Promise.all([
			fetch('http://localhost:4000/category?type=EXPENSE', {
				credentials: 'include',
				headers: { Accept: 'application/json' }
			}),
			fetch('http://localhost:4000/category?type=INCOME', {
				credentials: 'include',
				headers: { Accept: 'application/json' }
			})
		]);
		if (!expRes.ok) throw new Error(await expRes.text());
		if (!incRes.ok) throw new Error(await incRes.text());

		const [expRaw, incRaw] = (await Promise.all([expRes.json(), incRes.json()])) as [
			Category[],
			Category[]
		];

		// Normalize to arrays (handles [], {data:[]}, {categories:[]}, etc.)
		const exp = asCategoryArray(expRaw).map((c) => ({
			...c,
			type: c.type ?? ('EXPENSE' as const)
		}));
		const inc = asCategoryArray(incRaw).map((c) => ({ ...c, type: c.type ?? ('INCOME' as const) }));

		const merged = dedupeById([...exp, ...inc]);
		categories = merged;
	}

	async function loadData() {
		loadCategories();
		try {
			const res = await fetch('http://localhost:4000/dashboard', {
				method: 'GET',
				credentials: 'include',
				headers: { Accept: 'application/json' }
			});

			if (!res.ok) {
				const errText = await res.text();
				throw new Error('HTTP ${res.status} ${res.statusText}: ${errText}');
			}

			const data = await res.json();
			// console.log('dashboard:', data);
			return data;
		} catch (err) {
			console.error('Failed to load dashboard:', err);
			throw err;
		}
	}

	let data: any = $state(null);

	onMount(async () => {
		data = await loadData();
		Parsedata(data);
	});

	let PeriodExpense = $state(0);
	let PeriodIncome = $state(0);
	let recentdata = $state([]);

	function Parsedata(data) {
		PeriodExpense = data.data.totalExpense;
		PeriodIncome = data.data.totalIncome;
		recentdata = data.data.recentTransactions;
	}

	// async function SubmitTransaction(p) {
	// 	console.log(p);
	// 	Addshow = false;
	// 	let postdata = {
	// 		amount: p.amount,
	// 		description: p.note,
	// 		type: p.type,
	// 		date: '2025-09-09T12:30:00.000Z',
	// 		categoryId: p.category || null
	// 	};
	// 	const response = await fetch('http://localhost:4000/transaction/', {
	// 		method: 'POST',
	// 		credentials: 'include',
	// 		headers: {
	// 			'Content-Type': 'application/json' // <-- tell server this is JSON
	// 		},
	// 		body: JSON.stringify(postdata)
	// 	});
	// 	console.log('Sending to API:', { postdata });
	// 	console.log(JSON.stringify(postdata));
	// 	if (response.ok) {
	// 		alert('Add submitted successfully!');
	// 		// Optionally clear form fields or redirect
	// 	} else {
	// 		alert('Error submitting.');
	// 		const textBody: string = await response.text();
	// 		alert(textBody);
	// 	}
	// }
</script>

{#key editTxn?.id ?? 'create'}
	<AddTransaction
		open={Addshow}
		onClose={() => {
			Addshow = false;
			editTxn = null;
		}}
		{editTxn}
		{categories}
		currencies={['THB', 'USD', 'JPY']}
		onSubmit={(p) => SubmitTransaction(p)}
	/>
{/key}

<div class="px-6 py-10 md:px-20">
	<div class="flex justify-between">
		<div
			class="flex items-center justify-center rounded-xl bg-gradient-to-b from-[#86D988] to-[#5AA698]"
		>
			<!--Add Transaction button-->
			<button
				name="Add Transaction"
				class="flex items-center justify-center p-3 font-mono font-semibold text-white hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-xl hover:shadow-emerald-500/35"
				onclick={openAdd}
			>
				+ Add Transaction
			</button>
		</div>

		<div>
			<!--Date-->
			<div class="inline-flex items-center gap-3">
				<button
					class="flex size-8 items-center justify-center rounded-2xl pb-1 ring-1 ring-black/10 disabled:opacity-30"
				>
					{symbolLeft}
				</button>

				<div class="flex items-center gap-2 rounded-xl bg-white/70 px-4 py-2 ring-1 ring-black/10">
					<span aria-hidden="true"> 📅 </span>
					<span class="items-center font-mono">
						{label}
					</span>
				</div>
				<button
					class="flex size-8 items-center justify-center rounded-2xl pb-1 ring-1 ring-black/10 disabled:opacity-30"
				>
					{symbolRight}
				</button>
			</div>
		</div>
	</div>

	<div class="mt-10 grid grid-cols-1 gap-10 md:grid-cols-3">
		<TransactionCard
			title="Current Wallet Balance"
			value={PeriodIncome - PeriodExpense}
			format="currency"
			decimals={2}
			locale="en-GB"
			currency="THB"
			currencyDisplay="code"
			negative={false}
		/>
		<TransactionCard
			title="Total Period Expenses"
			value={-PeriodExpense}
			format="currency"
			decimals={2}
			locale="en-GB"
			currency="THB"
			currencyDisplay="code"
			negative={true}
		/>
		<TransactionCard
			title="Total Period Income"
			value={PeriodIncome}
			format="currency"
			decimals={2}
			locale="en-GB"
			currency="THB"
			currencyDisplay="code"
			negative={false}
		/>
	</div>
	<div class="mt-10">
		<TransList
			{recentdata}
			{categories}
			onAdd={() => (Addshow = true)}
			onItemClick={(t) => openEdit(t)}
		/>
	</div>
</div>
