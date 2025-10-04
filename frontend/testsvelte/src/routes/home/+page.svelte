<script lang="ts">
	import TransactionList from '$lib/components/Translist.svelte';
	import Summary from '$lib/components/Summary.svelte';
	import CompareCard from '$lib/components/Compare-line.svelte';
	import Piechart from '$lib/components/Piechart.svelte';
	import type { ApexOptions } from 'apexcharts';
	import { onMount } from 'svelte';

	async function load() {
		//api call to get data from backend

		return {};
	}

	onMount(() => {
		loadData();//this month by default
		loadData(new Date(2025, 9 ,13));//y m d ? month little error
	});

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
		// income examples (optional)
		{ id: 'salary', name: 'Salary', color: '#16A34A', icon: '💰', type: 'INCOME' },
		{ id: 'other-income', name: 'Other Income', color: '#22C55E', icon: '+', type: 'INCOME' }
	]);

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

	// Helper: start/end of a month in local time
	const monthRange = (d = new Date()) => {
		const start = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
		const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
		return { start, end };
	};

	// Optional: ensure we always return an array
	const asTxnArray = (raw: unknown) => {
		if (Array.isArray(raw)) return raw;
		if (raw && typeof raw === 'object') {
			const o = raw as any;
			if (Array.isArray(o.transactions)) return o.transactions;
			if (Array.isArray(o.data)) return o.data;
		}
		return [];
	};

	// Load both income & expense within the month of `when` (default: now)
	async function loadData(when?: Date) {
		loadCategories();

		const { start, end } = monthRange(when);
		const paramsBase = new URLSearchParams({
			dateFrom: start.toISOString(),
			dateTo: end.toISOString()
			// you can add pagination here if needed, e.g. limit: '100'
		});

		const makeUrl = (type: 'INCOME' | 'EXPENSE') => {
			const qs = new URLSearchParams(paramsBase);
			qs.set('type', type);
			return `http://localhost:4000/transaction?${qs.toString()}`;
		};

		try {
			const [incRes, expRes] = await Promise.all([
				fetch(makeUrl('INCOME'), {
					method: 'GET',
					credentials: 'include',
					headers: { Accept: 'application/json' }
				}),
				fetch(makeUrl('EXPENSE'), {
					method: 'GET',
					credentials: 'include',
					headers: { Accept: 'application/json' }
				})
			]);

			if (!incRes.ok)
				throw new Error(`INCOME ${incRes.status} ${incRes.statusText}: ${await incRes.text()}`);
			if (!expRes.ok)
				throw new Error(`EXPENSE ${expRes.status} ${expRes.statusText}: ${await expRes.text()}`);

			const [incRaw, expRaw] = await Promise.all([incRes.json(), expRes.json()]);

			const income = asTxnArray(incRaw);
			const expense = asTxnArray(expRaw);

			const result = {
				range: { dateFrom: start.toISOString(), dateTo: end.toISOString() },
				income,
				expense,
				incomeMeta: (incRaw as any)?.pagination ?? null,
				expenseMeta: (expRaw as any)?.pagination ?? null
			};
			console.log('this (monthly) result:', result);
			return result;
		} catch (err) {
			console.error('Failed to load monthly:', err);
			throw err;
		}
	}

	// common pie opts
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
		series: [40, 25, 20, 15],
		colors: ['#EF4444', '#F97316', '#EAB308', '#06B6D4'],
		labels: ['Food', 'Rent', 'Utilities', 'Entertainment']
	};

	const incomeOptions: ApexOptions = {
		...pieCommon,
		series: [190, 20, 10],
		colors: ['#22C55E', '#3B82F6', '#A855F7'],
		labels: ['Salary', 'Investments', 'Other']
	};
</script>

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
	<TransactionList />
	<Summary />
</div>
