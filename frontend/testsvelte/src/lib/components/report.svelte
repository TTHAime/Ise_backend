<script lang="ts">
	import { dialog, Modal, Button, Spinner } from 'flowbite-svelte';
	import jsPDF from 'jspdf';
	import { onMount } from 'svelte';
	import autoTable from 'jspdf-autotable';
	import axios from 'axios';
	import { ApiRoot } from '$lib/utils/stores';
	import { DownloadOutline, MinimizeOutline, XSolid } from 'flowbite-svelte-icons';

	//For test only
	let { month = $bindable(), year = $bindable() } = $props<{
		month?: number;
		year?: number;
	}>();
	let showPreview = $state(false);

	type DailyDatum = {
		date: string; // ISO date (YYYY-MM-DD)
		income: number;
		expense: number;
		count: number;
	};

	const monthNames = [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December'
	];

	type CategoryBreakdown = {
		categoryId: string;
		categoryName: string;
		categoryColor: string; // hex
		categoryIcon: string; // your UI can map this to an icon set
		type: 'INCOME' | 'EXPENSE';
		total: number;
		count: number;
		percentage: number; // 0..100
	};

	type MonthlyReport = {
		month: string; // 'กันยายน'
		year: number; // 2025
		totalIncome: number;
		totalExpense: number;
		netIncome: number;
		transactionCount: number;
		dailyData: DailyDatum[];
		categoryBreakdown: CategoryBreakdown[];
	};

	type reportMonthly = {
		month: string;
		year: number;
		totalIncome: number;
		totalExpense: number;
		netIncome: number;
		transactionCount: number;
		dailyData: Array<{ date: string; income: number; expense: number; count: number }>;
		categoryBreakdown: Array<{
			categoryId: string;
			categoryName: string;
			categoryColor: string;
			categoryIcon: string;
			type: string;
			total: number;
			count: number;
			percentage: number;
		}>;
	};

	let loading = $state(true);
	let loadingProgress = $state(0);
	let loadingStage = $state('Initializing...');
	let error = $state('');
	let dataMonthly: reportMonthly | null = $state(null);
	let isComputing = $state(false);

	function toMonthlyReport(raw: any): MonthlyReport {
		return {
			month: String(raw.month),
			year: Number(raw.year),
			totalIncome: Number(raw.totalIncome),
			totalExpense: Number(raw.totalExpense),
			netIncome: Number(raw.netIncome),
			transactionCount: Number(raw.transactionCount),
			dailyData: Array.isArray(raw.dailyData)
				? raw.dailyData.map((d: any) => ({
						date: String(d.date),
						income: Number(d.income),
						expense: Number(d.expense),
						count: Number(d.count)
					}))
				: [],
			categoryBreakdown: Array.isArray(raw.categoryBreakdown)
				? raw.categoryBreakdown.map((d: any) => ({
						categoryId: String(d.categoryId),
						categoryName: String(d.categoryName),
						categoryColor: String(d.categoryColor),
						categoryIcon: String(d.categoryIcon),
						type: (d.type === 'INCOME' ? 'INCOME' : 'EXPENSE') as 'INCOME' | 'EXPENSE',
						total: Number(d.total),
						count: Number(d.count),
						percentage: Number(d.percentage)
					}))
				: []
		};
	}

	async function loadDataReport() {
		if (year === null && month === null) return;

		loading = true;
		loadingProgress = 0;
		error = '';

		const startTime = Date.now();
		const minimumLoadTime = 15500; // 1.5 seconds minimum

		try {
			// Stage 1: Fetching data (0-40%)
			loadingStage = 'Fetching data from server...';
			loadingProgress = 10;

			const res = await axios(`${ApiRoot}report/monthly?year=${year}&month=${month}`, {
				method: 'GET',
				withCredentials: true,
				headers: { Accept: 'application/json' },
				validateStatus: () => true
			});

			if (!(res.status >= 200 && res.status <= 300))
				throw new Error(`API ${res.status} ${res.statusText}`);

			loadingProgress = 40;

			// Stage 2: Processing data (40-70%)
			loadingStage = 'Processing report data...';
			const processingDelay = Math.max(300, minimumLoadTime * 0.25 - (Date.now() - startTime));
			await new Promise((resolve) => setTimeout(resolve, processingDelay));

			const report: MonthlyReport = toMonthlyReport(res.data?.data);
			loadingProgress = 70;

			// Stage 3: Computing statistics (70-90%)
			loadingStage = 'Computing statistics...';
			const computingDelay = Math.max(300, minimumLoadTime * 0.25);
			await new Promise((resolve) => setTimeout(resolve, computingDelay));

			dataMonthly = report;
			loadingProgress = 90;

			// Stage 4: Finalizing (90-100%)
			loadingStage = 'Finalizing report...';
			const finalizingDelay = Math.max(200, minimumLoadTime * 0.15);
			await new Promise((resolve) => setTimeout(resolve, finalizingDelay));

			loadingProgress = 100;
			loadingStage = 'Report ready!';

			// Ensure minimum total time
			const elapsedTime = Date.now() - startTime;
			const remainingTime = minimumLoadTime - elapsedTime;

			if (remainingTime > 0) {
				await new Promise((resolve) => setTimeout(resolve, remainingTime));
			}

			console.log('Load Data', report);
			// console.log(`Total loading time: ${Date.now() - startTime}ms`);
		} catch (e: any) {
			error = e?.message ?? 'Failed to load data.';
			loadingProgress = 0;

			// Apply minimum time even for errors
			const elapsedTime = Date.now() - startTime;
			const remainingTime = minimumLoadTime - elapsedTime;

			if (remainingTime > 0) {
				await new Promise((resolve) => setTimeout(resolve, remainingTime));
			}
		} finally {
			setTimeout(() => {
				loading = false;
				isComputing = false;
			}, 300);
		}
	}

	$effect(() => {
		if (month != null && year != null) {
			// Reset states when month/year changes
			loading = true;
			loadingProgress = 0;
			loadingStage = 'Initializing...';
			dataMonthly = null; // Clear previous data
			error = '';

			loadDataReport();
		}
	});
	//PDF Header and footer
	function addHeaderMonthly(
		pdf: jsPDF,
		m: string,
		y: number,
		totalIncome: number,
		totalExpense: number,
		netIncome: number,
		transactionCount: number
	): number {
		const pageWidth = pdf.internal.pageSize.getWidth();
		const left = 40; //left margin
		const right = 40; //right margin
		const headerTopY = 30; //top padding
		const colGap = 16; //Column gap

		//Month and year
		pdf.setFontSize(14);
		pdf.setFont('helvetica', 'bold');
		pdf.text(`Month : ${m}-${y}`, left, headerTopY);

		//Separator line
		const sepY = headerTopY + 10;
		pdf.setLineWidth(0.5);
		pdf.line(left, sepY, pageWidth - right, sepY);

		//2 column for total income and total expense
		const labelSize = 12;
		const valueSize = 12;

		//left Column = Income and expense
		let rowY = sepY + 18;
		const leftColX = left;

		pdf.setFontSize(labelSize);
		pdf.text('Total Income', leftColX, rowY);
		pdf.setFontSize(valueSize);
		pdf.setFont('helvetica', 'bold');
		pdf.text(totalIncome.toString(), leftColX, rowY + 14);

		pdf.setFontSize(labelSize);
		pdf.text('Total Expense', leftColX, rowY + 32);
		pdf.setFontSize(valueSize);
		pdf.setFont('helvetica', 'bold');
		pdf.text(totalExpense.toString(), leftColX, rowY + 46);

		//Right column = net and transaction (right-aligned Values)
		const rightColX = pageWidth / 2 + colGap;
		const colWidth = pageWidth - right - rightColX;
		const valueX = rightColX + colWidth;

		pdf.setFont('helvetica', 'normal');
		pdf.setFontSize(labelSize);
		pdf.text('Net Income', rightColX, rowY, { maxWidth: colWidth });
		pdf.setFontSize(valueSize);
		pdf.setFont('helvetica', 'bold');
		const netStr = netIncome.toString();
		pdf.text(netStr, valueX, rowY + 14, { align: 'right' });

		pdf.setFont('helvetica', 'normal');
		pdf.setFontSize(labelSize);
		pdf.text('Transactions', rightColX, rowY + 32, { maxWidth: colWidth });
		pdf.setFontSize(valueSize);
		pdf.setFont('helvetica', 'bold');
		pdf.text(String(transactionCount), valueX, rowY + 46, { align: 'right' });

		//Bottom separator
		const bottomY = rowY + 60;
		pdf.setLineWidth(0.2);
		pdf.line(left, bottomY, pageWidth - right, bottomY);

		return bottomY + 16;
	}

	//add Footer
	function addFooter(pdf: jsPDF) {
		const pageCount = pdf.getNumberOfPages();
		const size = pdf.internal.pageSize;
		pdf.setFontSize(10);

		for (let i = 1; i <= pageCount; i++) {
			pdf.setPage(i);
			const footerY = size.getHeight() - 20;
			const text = `page ${i} of ${pageCount}`;
			const textWidth = pdf.getTextWidth(text);
			pdf.text(text, (size.getWidth() - textWidth) / 2, footerY);
		}
	}

	//kpiCard
	function kpiCard(
		pdf: jsPDF,
		x: number,
		y: number,
		w: number,
		h: number,
		label: string,
		value: string,
		alignRight = false
	) {
		//card background
		pdf.setDrawColor(220);
		pdf.setFillColor('#F5F5F5');
		pdf.roundedRect(x, y, w, h, 6, 6, 'DF');

		//label
		pdf.setTextColor(110);
		pdf.setFontSize(10);
		pdf.setFont('helvetica', 'normal');
		pdf.text(label, x + 12, y + 16);

		//value
		pdf.setTextColor(0);
		pdf.setFontSize(16);
		pdf.setFont('helvetica', 'normal');
		const valX = alignRight ? x + w - 12 : x + 12;
		pdf.text(value, valX, y + 36, { align: alignRight ? 'right' : 'left' });
	}

	//Export to PDF
	export function exportPDF() {
		if (!dataMonthly) return;

		const pdf = new jsPDF({ unit: 'pt', format: 'a4' });

		//Margins
		const left = 40,
			right = 40,
			top = 60;
		const pageWidth = pdf.internal.pageSize.getWidth();
		const contentWidth = pageWidth - left - right;

		//Header
		pdf.setFont('helvetica', 'bold');
		pdf.setFontSize(18);
		pdf.text('Monthly Report', pageWidth / 2, 34, { align: 'center' });

		pdf.setFont('helvetica', 'normal');
		pdf.setFontSize(12);
		pdf.text(`Month: ${month}, Year: ${year}`, pageWidth / 2, 52, { align: 'center' });

		//KPIs (2 rows x 2 cols)
		const cradWidth = (contentWidth - 16) / 2; //16px gap
		const row1Y = top;
		const row2Y = row1Y + 64; //each card height 52 + 12 spacing

		kpiCard(
			pdf,
			left,
			row1Y,
			cradWidth,
			52,
			'Total Income',
			dataMonthly.totalIncome.toString(),
			false
		);
		kpiCard(
			pdf,
			left + cradWidth + 16,
			row1Y,
			cradWidth,
			52,
			'Net Income',
			dataMonthly.netIncome.toString(),
			true
		);
		kpiCard(
			pdf,
			left,
			row2Y,
			cradWidth,
			52,
			'Total Expense',
			dataMonthly.totalExpense.toString(),
			false
		);
		kpiCard(
			pdf,
			left + cradWidth + 16,
			row2Y,
			cradWidth,
			52,
			'Transactions',
			dataMonthly.transactionCount.toString(),
			true
		);

		let y = row2Y + 80; //Content start

		//Dialy Summary
		pdf.setFont('helvetica', 'bold');
		pdf.setFontSize(14);
		pdf.text('Daily summary', left, y);
		y += 15;

		autoTable(pdf, {
			startY: y + 6,
			head: [['Date', 'Income', 'Expense', 'Count']],
			body: dataMonthly.dailyData.map((d) => [d.date, d.income, d.expense, d.count]),
			styles: { font: 'helvetica', fontSize: 11, cellPadding: 6 },
			headStyles: { fillColor: [82, 250, 105], textColor: 0, fontStyle: 'bold' },
			columnStyles: {
				1: { halign: 'right' },
				2: { halign: 'right' },
				3: { halign: 'right' }
			},
			margin: { left, right }
		});

		y = (pdf as any).lastAutoTable.finalY + 22;

		//Category breakdown
		pdf.setFont('helvetica', 'bold');
		pdf.setFontSize(14);
		pdf.text('Category breakdown', left, y);
		y += 10;

		const incomeRows = dataMonthly.categoryBreakdown.filter((c) => c.type === 'INCOME');
		const expenseRows = dataMonthly.categoryBreakdown.filter((c) => c.type === 'EXPENSE');

		autoTable(pdf, {
			startY: y + 6,
			head: [['[Income] Category', 'Total', 'Percentage (%)', 'Transactions']],
			body: incomeRows.map((c) => [c.categoryName, c.total, c.percentage, c.count]),
			styles: { font: 'helvetica', fontSize: 11, cellPadding: 6 },
			headStyles: { fillColor: [82, 250, 105], textColor: 0, fontStyle: 'bold' },
			columnStyles: {
				1: { halign: 'right' },
				2: { halign: 'right' },
				3: { halign: 'right' }
			},
			margin: { left, right }
		});

		const afterIncomeY = (pdf as any).lastAutoTable.finalY;

		autoTable(pdf, {
			startY: afterIncomeY + 12,
			head: [['[Expense] Category', 'Total', 'Percentage (%)', 'Transactions']],
			body: expenseRows.map((c) => [c.categoryName, c.total, c.percentage, c.count]),
			styles: { font: 'helvetica', fontSize: 11, cellPadding: 6 },
			headStyles: { fillColor: [82, 250, 105], textColor: 0, fontStyle: 'bold' },
			columnStyles: {
				1: { halign: 'right' },
				2: { halign: 'right' },
				3: { halign: 'right' }
			},
			margin: { left, right }
		});

		addFooter(pdf);
		pdf.save(`report-${dataMonthly.month ?? 'export'}.pdf`);
	}

	export function showPreviewModal() {
		// Always show modal and trigger fresh load
		showPreview = true;
		loading = true;
		loadingProgress = 0;
		loadingStage = 'Initializing...';
		dataMonthly = null; // Clear any existing data
		error = '';

		if (month != null && year != null) {
			loadDataReport();
		}
	}

	function downloadPDF() {
		try {
			exportPDF();
		} catch (e: any) {
			alert('Failed to generate PDF: ' + e.message);
		}
	}

	let incomeCategories = dataMonthly?.categoryBreakdown.filter((c) => c.type === 'INCOME') ?? [];
	let expenseCategories = dataMonthly?.categoryBreakdown.filter((c) => c.type === 'EXPENSE') ?? [];

	$effect(() => {
		incomeCategories = dataMonthly?.categoryBreakdown.filter((c) => c.type === 'INCOME') ?? [];
		expenseCategories = dataMonthly?.categoryBreakdown.filter((c) => c.type === 'EXPENSE') ?? [];
	});
</script>

<!-- Preview Modal -->
<Modal bind:open={showPreview} size="xl" class="w-full" dismissable={true}>
	<div class="flex items-center justify-between border-b pb-4">
		<h3 class="text-xl font-semibold text-gray-900 dark:text-white">Monthly Report Preview</h3>
	</div>

	{#if error}
		<div class="rounded-lg bg-red-50 p-4 text-red-800">
			<p class="font-medium">Error loading report</p>
			<p class="text-sm">{error}</p>
		</div>
	{:else if loading}
		<div class="flex flex-col items-center justify-center space-y-6 py-16">
			<!-- Animated Spinner -->
			<div class="relative">
				<div
					class="h-20 w-20 animate-spin rounded-full border-4 border-gray-200 border-t-green-500"
				></div>
				<div class="absolute inset-0 flex items-center justify-center">
					<span class="text-lg font-bold text-green-600">{loadingProgress}%</span>
				</div>
			</div>

			<!-- Loading Stage Text -->
			<div class="text-center">
				<p class="text-lg font-semibold text-gray-700">{loadingStage}</p>
				<p class="mt-1 text-sm text-gray-500">Please wait while we prepare your report</p>
			</div>

			<!-- Progress Bar -->
			<div class="w-full max-w-md">
				<div class="h-2 w-full overflow-hidden rounded-full bg-gray-200">
					<div
						class="h-full rounded-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-300 ease-out"
						style="width: {loadingProgress}%"
					></div>
				</div>
			</div>

			<!-- Loading Steps Indicator -->
			<div class="flex items-center space-x-4 text-xs text-gray-600">
				<div class="flex items-center space-x-1">
					<div
						class="h-2 w-2 rounded-full {loadingProgress >= 10 ? 'bg-green-500' : 'bg-gray-300'}"
					></div>
					<span>Fetch</span>
				</div>
				<div class="flex items-center space-x-1">
					<div
						class="h-2 w-2 rounded-full {loadingProgress >= 40 ? 'bg-green-500' : 'bg-gray-300'}"
					></div>
					<span>Process</span>
				</div>
				<div class="flex items-center space-x-1">
					<div
						class="h-2 w-2 rounded-full {loadingProgress >= 70 ? 'bg-green-500' : 'bg-gray-300'}"
					></div>
					<span>Compute</span>
				</div>
				<div class="flex items-center space-x-1">
					<div
						class="h-2 w-2 rounded-full {loadingProgress >= 100 ? 'bg-green-500' : 'bg-gray-300'}"
					></div>
					<span>Ready</span>
				</div>
			</div>
		</div>
	{:else if dataMonthly}
		<div class="max-h-[70vh] overflow-y-auto">
			<!-- Preview Content (matches PDF structure) -->
			<div class="space-y-6 p-6">
				<!-- Header -->
				<div class="text-center">
					<h1 class="text-2xl font-bold">Monthly Report</h1>
					<p class="text-gray-600">
						{monthNames[month - 1]}
						{year}
					</p>
				</div>

				<!-- KPI Cards -->
				<div class="grid grid-cols-2 gap-4">
					<div class="rounded-lg border bg-gray-50 p-4">
						<p class="text-sm text-gray-600">Total Income</p>
						<p class="text-xl font-bold">฿{dataMonthly.totalIncome.toLocaleString()}</p>
					</div>
					<div class="rounded-lg border bg-gray-50 p-4 text-right">
						<p class="text-sm text-gray-600">Net Income</p>
						<p class="text-xl font-bold">฿{dataMonthly.netIncome.toLocaleString()}</p>
					</div>
					<div class="rounded-lg border bg-gray-50 p-4">
						<p class="text-sm text-gray-600">Total Expense</p>
						<p class="text-xl font-bold">฿{dataMonthly.totalExpense.toLocaleString()}</p>
					</div>
					<div class="rounded-lg border bg-gray-50 p-4 text-right">
						<p class="text-sm text-gray-600">Transactions</p>
						<p class="text-xl font-bold">{dataMonthly.transactionCount}</p>
					</div>
				</div>

				<!-- Daily Summary -->
				<div>
					<h3 class="mb-3 text-lg font-bold">Daily Summary</h3>
					<div class="overflow-x-auto">
						<table class="w-full text-left text-sm">
							<thead class="bg-green-500 text-xs uppercase text-white">
								<tr>
									<th class="px-4 py-3">Date</th>
									<th class="px-4 py-3 text-right">Income</th>
									<th class="px-4 py-3 text-right">Expense</th>
									<th class="px-4 py-3 text-center">Transactions</th>
								</tr>
							</thead>
							<tbody>
								{#each dataMonthly.dailyData as daily}
									<tr class="border-b hover:bg-gray-50">
										<td class="px-4 py-3">{daily.date}</td>
										<td class="px-4 py-3 text-right">฿{daily.income.toLocaleString()}</td>
										<td class="px-4 py-3 text-right">฿{daily.expense.toLocaleString()}</td>
										<td class="px-4 py-3 text-center">{daily.count}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>

				<!-- Category Breakdown -->
				<div>
					<h3 class="mb-3 text-lg font-bold">Category Breakdown</h3>

					{#if incomeCategories.length > 0}
						<h4 class="mb-2 text-sm font-semibold text-green-600">Income Categories</h4>
						<div class="mb-4 overflow-x-auto">
							<table class="w-full text-left text-sm">
								<thead class="bg-green-500 text-xs uppercase text-white">
									<tr>
										<th class="px-4 py-3">Category</th>
										<th class="px-4 py-3 text-right">Total</th>
										<th class="px-4 py-3 text-right">%</th>
										<th class="px-4 py-3 text-center">Count</th>
									</tr>
								</thead>
								<tbody>
									{#each incomeCategories as cat}
										<tr class="border-b hover:bg-gray-50">
											<td class="px-4 py-3">{cat.categoryName}</td>
											<td class="px-4 py-3 text-right">฿{cat.total.toLocaleString()}</td>
											<td class="px-4 py-3 text-right">{cat.percentage.toFixed(1)}%</td>
											<td class="px-4 py-3 text-center">{cat.count}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}

					{#if expenseCategories.length > 0}
						<h4 class="mb-2 text-sm font-semibold text-red-600">Expense Categories</h4>
						<div class="overflow-x-auto">
							<table class="w-full text-left text-sm">
								<thead class="bg-red-500 text-xs uppercase text-white">
									<tr>
										<th class="px-4 py-3">Category</th>
										<th class="px-4 py-3 text-right">Total</th>
										<th class="px-4 py-3 text-right">%</th>
										<th class="px-4 py-3 text-center">Count</th>
									</tr>
								</thead>
								<tbody>
									{#each expenseCategories as cat}
										<tr class="border-b hover:bg-gray-50">
											<td class="px-4 py-3">{cat.categoryName}</td>
											<td class="px-4 py-3 text-right">฿{cat.total.toLocaleString()}</td>
											<td class="px-4 py-3 text-right">{cat.percentage.toFixed(1)}%</td>
											<td class="px-4 py-3 text-center">{cat.count}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Download Button -->
		<div class="mt-4 flex justify-end border-t pt-4">
			<Button color="green" onclick={downloadPDF}>
				<DownloadOutline class="mr-2 h-5 w-5" />
				Download PDF
			</Button>
		</div>
	{/if}
</Modal>

<style>
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
