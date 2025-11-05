<script lang="ts">
	import AddTransaction from '$lib/components/AddTransaction.svelte';
	import TransactionCard from '$lib/components/TransactionCard.svelte';
	import TransList from '$lib/components/TransactionList.svelte';
	import { onMount } from 'svelte';
	import { ApiRoot } from '$lib/utils/stores';
	import NotificationDialog from '$lib/components/NotificationModal.svelte';
	import axios from 'axios';

	let notification = $state({
		isOpen: false,
		message: '',
		type: 'success',
		title: ''
	});

	function showNotification(message, type = 'success', title = '') {
		notification = {
			isOpen: true,
			message,
			type,
			title
		};
	}

	function closeNotification() {
		notification = { ...notification, isOpen: false };
	}
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
		// income examples (optional)
		{ id: 'salary', name: 'Salary', color: '#16A34A', icon: '💰', type: 'INCOME' },
		{ id: 'other-income', name: 'Other Income', color: '#22C55E', icon: '+', type: 'INCOME' }
	]);

	let editTxn: import('$lib/components/AddTransaction.svelte').EditTxn | null = $state(null);
	let Addshow = $state(false);

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

	async function SubmitTransaction(p: {
		id: any;
		type: any;
		category: any;
		date: any;
		note: any;
		amount: any;
		currency?: string;
		recurrence?: 'NEVER' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
		ends?: string;
		receipt?: File | null | undefined;
	}) {
		if (p.receipt !== undefined) {
			return uploadReceiptAsync(p.receipt);
		}
		const method = p.id ? 'PATCH' : 'POST';
		const url = p.id
			? `${ApiRoot}transaction/`.concat(p.id) // up
			: `${ApiRoot}transaction`; // add
		const body = {
			amount: p.amount,
			description: p.note,
			type: p.type,
			date: p.date,
			categoryId: p.category
		};

		const res = await axios(url, {
			method,
			withCredentials: true,
			headers: { 'Content-Type': 'application/json' },
			data: JSON.stringify(body)
		})
			.then(function (response) {
				showNotification(`Transaction ${p.id ? 'updated' : 'added'} successfully.`, 'success');
			})
			.catch(function (error) {
				// showNotification('Failed to submit transaction.', 'error');
			});

		// close & clear
		Addshow = false;
		editTxn = null;
		loadall();
	}

	// Async uploader that returns a Promise<boolean>
	async function uploadReceiptAsync(receiptFile: File | null): Promise<boolean> {
		//didnt verify my api yet
		if (!receiptFile) return (showNotification('No receipt file provided.', 'warning'), false);
		const formData = new FormData();
		formData.append('image', receiptFile);
		for (const [key, value] of formData.entries()) {
			if (value instanceof File) {
				console.log(key, { name: value.name, type: value.type, size: value.size });
			} else {
				console.log(key, value);
			}
		}
		// const res = await fetch(`${ApiRoot}transaction/slip`, {//axios 401 problem idk
		// 	method: 'POST',
		// 	credentials: 'include',
		// 	body: formData
		// });
		const res = await axios
			.post(`${ApiRoot}transaction/slip`, formData,{
				withCredentials: true,
			})
			.then((res) => {
				if (res.status === 200) {
					showNotification('Receipt uploaded successfully.From axios', 'success');
					const tt = {
						id: res.data.transaction.transaction.id,
						date: res.data.transaction.transaction.date,
						category: res.data.transaction.transaction.category,
						note: 'From receipt',
						amount: res.data.transaction.transaction.amount
					};
					openEdit(tt);
					return true;
				} else showNotification('Failed to upload receipt.', 'error');
			})
			.catch((err) => {
				console.error('Error uploading receipt:', err);
				return false;
			});
		return true;
	}

	export function uploadReceipt(file: File): boolean {
		uploadReceiptAsync(file).catch(() => {
			/* swallow errors here; caller only expects a boolean return */
		});
		return true;
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
			axios
				.get(`${ApiRoot}category?type=EXPENSE`, {
					withCredentials: true,
					headers: { Accept: 'application/json' }
				})
				.catch((err) => {
					console.error('Error fetching expense categories:', err);
					return { data: [] };
				}),
			axios
				.get(`${ApiRoot}category?type=INCOME`, {
					withCredentials: true,
					headers: { Accept: 'application/json' }
				})
				.catch((err) => {
					console.error('Error fetching income categories:', err);
					return { data: [] };
				})
		]);

		const [expRaw, incRaw] = (await Promise.all([expRes.data, incRes.data])) as [
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
			const res = await axios(`${ApiRoot}dashboard`, {
				method: 'GET',
				withCredentials: true,
				headers: { Accept: 'application/json' }
			}).catch(async (err) => {
				console.error('Error fetching dashboard data:', err);
				throw err;
			});

			const data = await res.data;
			// console.log('dashboard:', data);
			return data;
		} catch (err) {
			console.error('Failed to load dashboard:', err);
			throw err;
		}
	}

	let data: any = $state(null);

	onMount(async () => {
		loadall();
	});

	async function loadall() {
		data = await loadData();
		Parsedata(data);
	}

	let PeriodExpense = $state(0);
	let PeriodIncome = $state(0);
	let recentdata = $state([]);

	function Parsedata(data: {
		data: { totalExpense: number; totalIncome: number; recentTransactions: never[] };
	}) {
		PeriodExpense = data.data.totalExpense;
		PeriodIncome = data.data.totalIncome;
		recentdata = data.data.recentTransactions;
	}
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
		{uploadReceipt}
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

<NotificationDialog
	isOpen={notification.isOpen}
	message={notification.message}
	type={notification.type}
	title={notification.title}
	onClose={closeNotification}
/>
