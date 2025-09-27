<script lang="ts">
	import AddTransaction from '$lib/components/AddTransaction.svelte';
	import TransactionCard from '$lib/components/TransactionCard.svelte';
	import TransList from '$lib/components/TransactionList.svelte';
	import { onMount } from 'svelte';
	const symbolLeft = '<';
	const symbolRight = '>';
	let label = $state('Date');

	const categories = $state([
		'Food',
		'Rent',
		'Utilities',
		'Entertainment',
		'Transport',
		'Other',
		'Pokemon'
	]);

	let daytoadd = new Date();

	let Addshow = $state(false);


	async function loadData() {
		try {
			const res = await fetch('http://localhost:4000/dashboard', {
				method: 'GET',
				credentials: 'include',
				headers: { Accept: 'application/json' }
			});

			if (!res.ok) {
				const errText = await res.text();
				throw new Error(`HTTP ${res.status} ${res.statusText}: ${errText}`);
			}

			const data = await res.json();
			console.log('dashboard:', data);
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

	function Parsedata(data) {
		PeriodExpense = data.data.totalExpense;
		PeriodIncome = data.data.totalIncome;
		console.log(PeriodExpense, PeriodIncome);

	}

	async function SubmitTransaction(p) {
		console.log(p);
		Addshow = false;
		let postdata = {
			amount: p.amount,
			description: p.note,
			type: p.type,
			date: '2025-09-09T12:30:00.000Z'
			//categoryId: 'cmfgbmjdw000ew93s96v1ic9b' //parsing required na dewi pap
		};
		const response = await fetch('http://localhost:4000/transaction/', {
			method: 'POST',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json' // <-- tell server this is JSON
			},
			body: JSON.stringify(postdata)
		});
		console.log('Sending to API:', { postdata });
		console.log(JSON.stringify(postdata));
		if (response.ok) {
			alert('Add submitted successfully!');
			// Optionally clear form fields or redirect
		} else {
			alert('Error submitting.');
			const textBody: string = await response.text();
			alert(textBody);
		}
	}
</script>

<AddTransaction
	open={Addshow}
	onClose={() => (Addshow = false)}
	{categories}
	currencies={['THB', 'USD', 'JPY']}
	onPrevPeriod={() => console.log('prev')}
	onNextPeriod={() => console.log('next')}
	onSubmit={(p) => SubmitTransaction(p)}
/>

<div class="px-6 py-10 md:px-20">
	<div class="flex justify-between">
		<div
			class="flex items-center justify-center rounded-xl bg-gradient-to-b from-[#86D988] to-[#5AA698]"
		>
			<!--Add Transaction button-->
			<button
				name="Add Transaction"
				class="flex items-center justify-center p-3 font-mono font-semibold text-white hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-xl hover:shadow-emerald-500/35"
				onclick={() => (Addshow = true)}
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
		<TransList />
	</div>
</div>
