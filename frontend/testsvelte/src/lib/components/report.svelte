<script lang="ts">
	import { dialog, Modal, Button, Spinner } from 'flowbite-svelte';
	import jsPDF from 'jspdf';
	import { onMount } from 'svelte';
	import autoTable from 'jspdf-autotable';
	import axios from 'axios';
	import { ApiRoot } from '$lib/utils/stores';
	import { DownloadOutline, MinimizeOutline, XSolid } from 'flowbite-svelte-icons';

	//For test only

	let { month = $bindable(9), year = $bindable(2025) } = $props<{ month?: number; year?: number }>();

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

	// ---- Pure frontend mock data ----
	const monthlyReportMock: MonthlyReport = {
		month: 'กันยายน',
		year: 2025,
		totalIncome: 60500,
		totalExpense: 17230,
		netIncome: 43270,
		transactionCount: 13,
		dailyData: [
			{ date: '2025-09-09', income: 2500, expense: 0, count: 1 },
			{ date: '2025-09-21', income: 0, expense: 110, count: 3 },
			{ date: '2025-09-22', income: 29000, expense: 17040, count: 5 },
			{ date: '2025-09-28', income: 29000, expense: 80, count: 4 }
		],
		categoryBreakdown: [
			{
				categoryId: '__UNCATEGORIZED__',
				categoryName: '(ไม่มีหมวดหมู่)',
				categoryColor: '#9CA3AF',
				categoryIcon: 'question',
				type: 'INCOME',
				total: 60500,
				count: 5,
				percentage: 100
			},
			{
				categoryId: '__UNCATEGORIZED__',
				categoryName: '(ไม่มีหมวดหมู่)',
				categoryColor: '#9CA3AF',
				categoryIcon: 'question',
				type: 'EXPENSE',
				total: 17230,
				count: 8,
				percentage: 100
			}
		]
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

	//derived year and month
	// let year:number = $derived(y ?? null);
	// let month:number = $derived(m ?? null);

	//loading and error
	let loading = true;
	let error = $state('');
	let dataMonthly: reportMonthly | null = $state(null);

	//Transform API data into MonthlyReport type data.
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

	//Load data from API
	async function loadDataReport() {
		if (year === null && month === null) return;
		try {
			const res = await axios(`${ApiRoot}report/monthly?year=${year}&month=${month}`, {
				method: 'GET',
				withCredentials: true,
				headers: { Accept: 'application/json' },
				validateStatus: () => true
			});

			if (!(res.status >= 200 && res.status <= 300))
				throw new Error(`API ${res.status} ${res.statusText}`);
			const report: MonthlyReport = toMonthlyReport(res.data?.data);
			dataMonthly = report;
			console.log('Load Data', report);
			// dataMonthly = monthlyReportMock;
		} catch (e: any) {
			error = e?.message ?? 'Failed to load data.';
		} finally {
			loading = false;
		}
	}

	onMount(loadDataReport);

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

	// //Write contents into pdf
	// function addTextBlock(pdf: jsPDF, text: string, x: number, y:number, maxWidth: number, lineHeight: number, bottomMargin: number, onNewPage?: () => number): number {
	//     const pageHeight = pdf.internal.pageSize.getHeight();
	//     const lines = pdf.splitTextToSize(text, maxWidth) as string[];

	//     for(const line of lines){
	//         //Check if current y pos is more than page height
	//         if(y + lineHeight > pageHeight - bottomMargin){
	//             pdf.addPage();
	//             y = onNewPage? onNewPage() : 70;
	//         }
	//         pdf.text(line, x, y);
	//         y += lineHeight;
	//     }

	//     return y; //return y for footer.
	// }

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
		if (!dataMonthly) {
			loadDataReport().then(() => {
				showPreview = true;
			});
		} else {
			showPreview = true;
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
		<div class="flex items-center justify-center py-12">
			<Spinner size="12" />
			<span class="ml-3">Loading report data...</span>
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
