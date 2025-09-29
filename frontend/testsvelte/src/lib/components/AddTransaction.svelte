<script lang="ts">
	import { fade } from 'svelte/transition';
	import { ButtonToggleGroup, ButtonToggle } from 'flowbite-svelte';

	// Shared types
	export type Category = {
		id: string;
		name: string;
		color?: string;
		icon?: string;
		type?: 'INCOME' | 'EXPENSE';
	};

	type Recurrence = 'NEVER' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
	export type SubmitPayload = {
		id?: string | number;
		type: 'INCOME' | 'EXPENSE';
		category: string | null; // <-- send Category.id
		date: string; // yyyy-mm-dd
		note: string;
		amount: number;
		currency: string;
		recurrence: Recurrence;
		ends: 'NEVER' | string;
		receipt?: File | null;
	};

	export type EditTxn = {
		id: string | number;
		type: 'INCOME' | 'EXPENSE';
		categoryId?: Category['id'];
		date: string; // ISO or yyyy-mm-dd
		note: string;
		amount: number;
		currency: string;
		recurrence?: Recurrence;
		ends?: 'NEVER' | string;
	};

	// ---- Props
	const props = $props<{
		open?: boolean;
		onClose?: () => void;
		periodText?: string;
		categories?: Category[]; // <-- Category[]
		currencies?: string[];
		onPrevPeriod?: () => void;
		onNextPeriod?: () => void;
		onSubmit?: (payload: SubmitPayload) => void;
		editTxn?: EditTxn | null;
	}>();

	// ---- Local state
	let singleValue: 'red' | 'green' = $state('green');
	function handleSingleSelect(v: 'red' | 'green') {
		singleValue = v;
	}

	const open = $derived(props.open ?? false);
	const onClose = $derived(props.onClose ?? (() => {}));
	const periodText = $derived(props.periodText ?? '');
	const currencies = $derived(props.currencies ?? ['THB']);
	const onSubmit = $derived(props.onSubmit ?? ((_: SubmitPayload) => {}));
	const editTxn = $derived(props.editTxn ?? null);

	const selectedType = $derived(singleValue === 'red' ? 'EXPENSE' : ('INCOME' as const));

	const pickCats = (src: unknown): Category[] =>
		Array.isArray(src)
			? src
			: Array.isArray((src as any)?.categories)
				? (src as any).categories
				: [];

	const allCats = $derived(
		(() => {
			const src = props.categories ?? (props as any).categoriesSet ?? [];
			return pickCats(src);
		})()
	);

	const catsForType = $derived(
		(Array.isArray(allCats) ? allCats : []).filter((c) => !c.type || c.type === selectedType)
	);

	const panelClass = $derived(
		selectedType === 'INCOME' ? 'box-transaction-income' : 'box-transaction-expense'
	);

	let firstField: HTMLSelectElement | null = $state(null);
	let receiptInput: HTMLInputElement | null = $state(null);

	let categorySel = $state(''); // '' -> null on submit
	let date = $state(new Date().toISOString().slice(0, 10));
	let note = $state('');
	let amount: number | '' = $state('');
	let currency = $state(currencies[0] ?? 'THB');

	let recurrence: Recurrence = $state('NEVER');
	let endsType: 'NEVER' | 'ON' = $state('NEVER');
	let endsOn = $state(new Date().toISOString().slice(0, 10));

	let receiptFile: File | null = $state(null);

	const toInputDate = (d: string) => {
		const dt = new Date(d);
		return isNaN(dt.getTime())
			? new Date().toISOString().slice(0, 10)
			: new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
	};

	$effect(() => {
		if (!categorySel) return;
		const match = catsForType.some((c) => c.id === categorySel);
		if (!match) categorySel = '';
	});

	$effect(() => {
		if (!open) return;

		if (editTxn) {
			// edit mode → prefill
			singleValue = editTxn.type === 'EXPENSE' ? 'red' : 'green';

			const resolvedId = editTxn.categoryId /* keep this; parent provides id */ ?? '';

			categorySel = resolvedId;
			date = toInputDate(editTxn.date);
			note = editTxn.note ?? '';
			amount = editTxn.amount ?? '';
			currency = editTxn.currency ?? currencies[0] ?? 'THB';
			recurrence = editTxn.recurrence ?? 'NEVER';

			if (editTxn.ends && editTxn.ends !== 'NEVER') {
				endsType = 'ON';
				endsOn = toInputDate(editTxn.ends);
			} else {
				endsType = 'NEVER';
			}
			receiptFile = null;
		} else {
			// add mode → reset clean
			singleValue = 'green'; // or 'red' if you prefer Expense default
			categorySel = '';
			date = new Date().toISOString().slice(0, 10);
			note = '';
			amount = '';
			currency = currencies[0] ?? 'THB';
			recurrence = 'NEVER';
			endsType = 'NEVER';
			endsOn = new Date().toISOString().slice(0, 10);
			receiptFile = null;
		}
	});

	$effect(() => {
		if (recurrence === 'NEVER' && endsType !== 'NEVER') endsType = 'NEVER';
	});

	function close() {
		onClose();
	}

	function pickReceipt() {
		receiptInput?.click();
	}
	function onFileChange(e: Event) {
		const f = (e.currentTarget as HTMLInputElement).files?.[0] ?? null;
		receiptFile = f;
	}
	function clearReceipt() {
		if (receiptInput) receiptInput.value = '';
		receiptFile = null;
	}
	function onBackdropClick(e: MouseEvent) {
		if (e.currentTarget === e.target) close();
	}

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		const value = Number(amount);
		const category = categorySel || null;

		if (!category) return alert('Please select a category.');
		if (!value || Number.isNaN(value) || value <= 0) return alert('Please enter a valid amount.');

		onSubmit({
			id: editTxn?.id,
			type: selectedType,
			category,
			date,
			note: note.trim(),
			amount: value,
			currency,
			recurrence,
			ends: endsType === 'NEVER' ? 'NEVER' : endsOn,
			receipt: receiptFile ?? undefined
		});
	}

	const submitLabel = $derived(editTxn ? 'Update Transaction' : 'Add Transaction');
</script>

<svelte:window on:keydown={(e) => open && e.key === 'Escape' && close()} />

{#if open}
	<div class="fixed inset-0 z-40 flex items-start items-center justify-center sm:p-40">
		<!-- Backdrop -->
		<div
			onclick={onBackdropClick}
			class="absolute inset-0 bg-black/50"
			transition:fade={{ duration: 100 }}
			aria-hidden="true"
		></div>

		<!-- Panel -->
		<div
			class="box-transaction relative z-10 w-auto rounded-3xl bg-white p-6 shadow ring-1 ring-black/10 dark:bg-gray-900 {panelClass}"
		>
			<div class="mb-4 flex items-center justify-between">
				<h1 class="head-text-shadow-black">{editTxn ? 'Edit Transaction' : 'Add Transaction'}</h1>
				{#if periodText}<span class="text-sm text-gray-500">{periodText}</span>{/if}
			</div>

			<!-- Toggle -->
			<ButtonToggleGroup onSelect={handleSingleSelect} class="mb-6">
				<ButtonToggle color="red" value="red" selected={singleValue === 'red'}>Expense</ButtonToggle
				>
				<ButtonToggle color="green" value="green" selected={singleValue === 'green'}
					>Income</ButtonToggle
				>
			</ButtonToggleGroup>

			<!-- Close -->
			<button
				type="button"
				class="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-300 dark:hover:bg-gray-800"
				aria-label="Close"
				onclick={close}
			>
				<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>

			<form onsubmit={handleSubmit} class="space-y-6">
				<!-- Row 1 -->
				<div class="grid grid-cols-1 gap-4 md:grid-cols-12">
					<div class="md:col-span-3">
						<label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">
							Category
							<div class="flex items-center rounded-2xl ring-1 ring-gray-300 dark:ring-gray-700">
								<select
									bind:value={categorySel}
									class="w-full rounded-2xl bg-transparent px-4 py-3 outline-none"
									bind:this={firstField}
								>
									<option value="" disabled selected>
										{catsForType.length
											? 'Select Category'
											: `No ${selectedType.toLowerCase()} categories`}
									</option>
									{#each catsForType as c}
										<option value={c.id}>{c.icon ? `${c.icon} ` : ''}{c.name}</option>
									{/each}
								</select>
							</div>
						</label>
					</div>

					<div class="md:col-span-3">
						<label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">
							Date
							<input
								type="date"
								bind:value={date}
								class="w-full rounded-2xl px-4 py-3 ring-1 ring-gray-300 focus:ring-2 focus:ring-blue-500 dark:bg-transparent dark:ring-gray-700"
							/>
						</label>
					</div>

					<div class="md:col-span-3">
						<label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">
							Note
							<input
								type="text"
								placeholder="Write Note"
								bind:value={note}
								class="w-full rounded-2xl px-4 py-3 ring-1 ring-gray-300 focus:ring-2 focus:ring-blue-500 dark:bg-transparent dark:ring-gray-700"
							/>
						</label>
					</div>

					<div class="md:col-span-2">
						<label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">
							Amount
							<input
								type="number"
								min="0"
								step="0.01"
								placeholder="0.00"
								bind:value={amount}
								class="w-full rounded-2xl px-4 py-3 text-right ring-1 ring-gray-300 focus:ring-2 focus:ring-blue-500 dark:bg-transparent dark:ring-gray-700"
							/>
						</label>
					</div>
					<div class="md:col-span-1">
						<label class="mb-1 block text-sm text-gray-600 dark:text-gray-300"
							>Currency
							<div class="flex items-center rounded-2xl ring-1 ring-gray-300 dark:ring-gray-700">
								<select
									bind:value={currency}
									class="w-full rounded-2xl bg-transparent px-4 py-3 outline-none"
								>
									{#each currencies as cur}<option value={cur}>{cur}</option>{/each}
								</select>
							</div>
						</label>
					</div>
				</div>

				<!-- Row 2 -->
				<div class="grid grid-cols-1 items-end gap-4 md:grid-cols-12">
					<div class="md:col-span-3">
						<label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">
							Auto Recurrence
							<select
								bind:value={recurrence}
								class="w-full rounded-2xl px-4 py-3 ring-1 ring-gray-300 dark:bg-transparent dark:ring-gray-700"
							>
								<option value="NEVER">Never</option>
								<option value="DAILY">Daily</option>
								<option value="WEEKLY">Weekly</option>
								<option value="MONTHLY">Monthly</option>
								<option value="YEARLY">Yearly</option>
							</select>
						</label>
					</div>

					<div class="md:col-span-4">
						<label class="mb-1 block text-sm text-gray-600 dark:text-gray-300">
							Ends
							<div class="flex gap-2">
								<select
									bind:value={endsType}
									disabled={recurrence === 'NEVER'}
									class="w-full rounded-2xl px-4 py-3 ring-1 ring-gray-300 disabled:opacity-40 dark:bg-transparent dark:ring-gray-700"
								>
									<option value="NEVER">Never</option>
									<option value="ON">On date</option>
								</select>
								<input
									type="date"
									bind:value={endsOn}
									disabled={endsType !== 'ON'}
									class="w-full rounded-2xl px-3 py-3 ring-1 ring-gray-300 disabled:opacity-40 dark:bg-transparent dark:ring-gray-700"
								/>
							</div>
						</label>
					</div>

					<div class="md:col-span-3">
						<label class="mb-1 block text-sm text-gray-600 opacity-0">
							Add Receipt
							<div class="flex items-center gap-3">
								<button
									type="button"
									onclick={pickReceipt}
									class="inline-flex w-full items-center justify-center rounded-2xl bg-gray-500 px-5 py-3 text-white hover:bg-gray-600 md:w-auto"
								>
									Add Receipt
								</button>
								{#if receiptFile}
									<div class="flex items-center gap-2 text-sm">
										<span class="max-w-[220px] truncate">{receiptFile.name}</span>
										<button
											type="button"
											class="text-red-600 hover:underline"
											onclick={clearReceipt}>remove</button
										>
									</div>
								{/if}
								<input
									class="hidden"
									bind:this={receiptInput}
									type="file"
									accept="image/*,application/pdf"
									onchange={onFileChange}
								/>
							</div>
						</label>
					</div>

					<div class="flex justify-end md:col-span-2">
						<button
							type="submit"
							class="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-400 to-green-500 px-6 py-3 text-white shadow hover:from-emerald-500 hover:to-green-600"
						>
							{submitLabel}
						</button>
					</div>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.box-transaction-expense {
		box-shadow:
			rgba(240, 46, 46, 0.4) 0px 5px,
			rgba(240, 46, 46, 0.3) 0px 10px,
			rgba(240, 46, 46, 0.2) 0px 15px,
			rgba(240, 46, 46, 0.1) 0px 20px,
			rgba(240, 46, 46, 0.05) 0px 25px;
	}
	.box-transaction-income {
		box-shadow:
			rgba(24, 234, 111, 0.721) 0px 5px,
			rgba(129, 239, 123, 0.336) 0px 10px,
			rgba(118, 242, 137, 0.258) 0px 15px,
			rgba(59, 242, 117, 0.396) 0px 20px,
			rgba(43, 192, 110, 0.311) 0px 25px;
	}
	.box-transaction {
		transition: box-shadow 180ms ease;
	}
</style>
