<script lang="ts">
	import { dialog } from 'flowbite-svelte';
    import jsPDF from 'jspdf';
    import { onMount } from 'svelte';
    import autoTable from 'jspdf-autotable';
	import axios from 'axios';
	import { ApiRoot } from '$lib/utils/stores';
	import { MinimizeOutline } from 'flowbite-svelte-icons';

    //For test only
    
    let month : number = $state(9);
    let year : number = $state(2025);

    type DailyDatum = {
        date: string;        // ISO date (YYYY-MM-DD)
        income: number;
        expense: number;
        count: number;
        };

    type CategoryBreakdown = {
        categoryId: string;
        categoryName: string;
        categoryColor: string;   // hex
        categoryIcon: string;    // your UI can map this to an icon set
        type: 'INCOME' | 'EXPENSE';
        total: number;
        count: number;
        percentage: number;      // 0..100
    };

    type MonthlyReport = {
        month: string;           // 'กันยายน'
        year: number;            // 2025
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
            { date: '2025-09-09', income: 2500,  expense: 0,     count: 1 },
            { date: '2025-09-21', income: 0,     expense: 110,   count: 3 },
            { date: '2025-09-22', income: 29000, expense: 17040, count: 5 },
            { date: '2025-09-28', income: 29000, expense: 80,    count: 4 }
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
        month: string,
        year: number;
        totalIncome: number;
        totalExpense: number;
        netIncome: number;
        transactionCount: number;
        dailyData : Array<{date: string, income: number, expense: number, count: number}>,
        categoryBreakdown: Array<{categoryId: string, categoryName: string, categoryColor: string, categoryIcon: string, type: string, total: number, count: number, percentage: number}>
    }
    
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
            dailyData: Array.isArray(raw.dailyData)? raw.dailyData.map((d: any) => ({
                date: String(d.date),
                income: Number(d.income),
                expense: Number(d.expense),
                count: Number(d.count)
            })) : [],
            categoryBreakdown: Array.isArray(raw.categoryBreakdown)? raw.categoryBreakdown.map((d: any) => ({
                categoryId: String(d.categoryId),
                categoryName: String(d.categoryName),
                categoryColor: String(d.categoryColor),
                categoryIcon: String(d.categoryIcon),
                type: (d.type === "INCOME"? "INCOME" : "EXPENSE") as "INCOME" | "EXPENSE",
                total: Number(d.total),
                count: Number(d.count),
                percentage: Number(d.percentage)
            })) : []
        };
    }    

    //Load data from API
    async function loadData()
    {   
        if(year === null && month === null) return;
        try{
            const res = await axios(`${ApiRoot}report/monthly?year=${year}&month=${month}`, {
                method: "GET",
                withCredentials: true,
                headers: {Accept: "application/json"},
                validateStatus: () => true,
            });

            if(!(res.status >= 200 && res.status <= 300)) throw new Error(`API ${res.status} ${res.statusText}`);
            const report: MonthlyReport = toMonthlyReport(res.data?.data);
            dataMonthly = report;
            console.log("Load Data");
            // dataMonthly = monthlyReportMock;
        }catch(e: any){
            error = e?.message ?? 'Failed to load data.';
        }finally{
            loading = false;
        }
    }

    // onMount(loadData);

    //PDF Header and footer
    function addHeaderMonthly(pdf: jsPDF, m: string, y:number, totalIncome: number, totalExpense: number, netIncome: number, transactionCount: number) : number
    {
        const pageWidth = pdf.internal.pageSize.getWidth();
        const left = 40;        //left margin
        const right = 40;       //right margin
        const headerTopY = 30;  //top padding
        const colGap = 16;      //Column gap
        

        //Month and year
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Month : ${m}-${y}`,left,headerTopY);

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
        pdf.text('Net Income', rightColX, rowY, {maxWidth: colWidth});
        pdf.setFontSize(valueSize);
        pdf.setFont('helvetica', 'bold');
        const netStr = netIncome.toString();
        pdf.text(netStr, valueX, rowY + 14, {align: 'right'});

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
        for(let i = 1; i <= pageCount; i++){
            pdf.setPage(i);
            const footerY = size.getHeight() - 20;
            const text = `page ${i} of ${pageCount}`;
            const textWidth = pdf.getTextWidth(text);
            pdf.text(text, (size.getWidth() - textWidth) / 2, footerY);
        }
    }

    //kpiCard
    function kpiCard(pdf: jsPDF, x: number, y: number, w: number, h:number, label: string, value: string, alignRight = false){
        //card background
        pdf.setDrawColor(220);
        pdf.setFillColor('#F5F5F5');
        pdf.roundedRect(x,y,w,h,6,6,'DF');

        //label
        pdf.setTextColor(110);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(label, x + 12, y + 16);

        //value
        pdf.setTextColor(0);
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'normal');
        const valX = alignRight? x + w - 12 : x + 12;
        pdf.text(value, valX, y + 36, {align: alignRight? 'right' : 'left'});
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
    export function exportPDF(){
        if(!dataMonthly) return;
        
        const pdf = new jsPDF({unit: 'pt', format: 'a4'});

        //Margins
        const left = 40, right = 40, top = 60;
        const pageWidth = pdf.internal.pageSize.getWidth();
        const contentWidth = pageWidth - left - right;

        //Header
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(18);
        pdf.text('Monthly Report', pageWidth / 2, 34, {align: "center"});
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(12);
        pdf.text(`Month: ${month}, Year: ${year}`, pageWidth / 2, 52, {align: 'center'});

        //KPIs (2 rows x 2 cols)
        const cradWidth = (contentWidth - 16) / 2; //16px gap
        const row1Y = top;
        const row2Y = row1Y + 64; //each card height 52 + 12 spacing
        kpiCard(pdf, left, row1Y, cradWidth, 52, 'Total Income',dataMonthly.totalIncome.toString(), false);
        kpiCard(pdf, left + cradWidth + 16, row1Y, cradWidth, 52, 'Net Income',dataMonthly.netIncome.toString() , true);
        kpiCard(pdf, left, row2Y, cradWidth, 52, 'Total Expense',dataMonthly.totalExpense.toString(), false);
        kpiCard(pdf, left + cradWidth + 16,row2Y,cradWidth, 52, 'Transactions',dataMonthly.transactionCount.toString(), true);

        let y = row2Y + 80; //Content start

        //Dialy Summary
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.text('Daily summary', left, y);
        y += 15;

        autoTable(pdf, {
            startY: y + 6,
            head: [['Date', 'Income', 'Expense', 'Count']],
            body: dataMonthly.dailyData.map(d => [d.date, d.income, d.expense, d.count]),
            styles: {font: 'helvetica', fontSize: 11, cellPadding: 6},
            headStyles: { fillColor: [82, 250, 105],textColor: 0, fontStyle: 'bold'},
            columnStyles: {
                1: {halign: 'right'},
                2: {halign : 'right'},
                3: {halign: 'right'}
            },
            margin: {left, right}
        });

        y = (pdf as any).lastAutoTable.finalY + 22;

        //Category breakdown
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.text('Category breakdown', left, y);
        y += 10;

        const incomeRows = dataMonthly.categoryBreakdown.filter(c => c.type === 'INCOME');
        const expenseRows = dataMonthly.categoryBreakdown.filter(c => c.type === 'EXPENSE');

        autoTable(pdf, {
            startY: y + 6,
            head: [['[Income] Category', 'Total', 'Percentage (%)', 'Transactions']],
            body: incomeRows.map(c => [c.categoryName, c.total, c.percentage, c.count]),
            styles: { font: 'helvetica', fontSize: 11, cellPadding: 6},
            headStyles: {fillColor: [82, 250, 105], textColor: 0, fontStyle: 'bold'},
            columnStyles: {
                1: {halign: 'right'},
                2: {halign: 'right'},
                3: {halign: 'right'},
            },
            margin: {left, right}
        });

        const afterIncomeY = (pdf as any).lastAutoTable.finalY;

        autoTable(pdf, {
            startY: afterIncomeY + 12,
            head: [['[Expense] Category', 'Total', 'Percentage (%)', 'Transactions']],
            body: expenseRows.map(c => [c.categoryName, c.total, c.percentage, c.count]),
            styles: { font: 'helvetica', fontSize: 11, cellPadding: 6},
            headStyles: {fillColor: [82, 250, 105], textColor: 0, fontStyle: 'bold'},
            columnStyles: {
                1: {halign: 'right'},
                2: {halign: 'right'},
                3: {halign: 'right'},
            },
            margin: {left, right}
        });

        addFooter(pdf);

        pdf.save(`report-${dataMonthly.month ?? 'export'}.pdf`);
    }
</script>

{#if error}
  <p class="text-red-600">{error}</p>
<!-- {:else if loading}
  <p>Loading data…</p> -->
{:else if dataMonthly}
  <!-- Simple on-screen preview of what the content is (not what the PDF looks like) -->
  <article class="max-w-[794px] mx-auto bg-white p-6 rounded-xl border">
    <h1 class="text-2xl font-semibold">{dataMonthly.year}</h1>
    {#if dataMonthly.month}<div class="opacity-70 mb-2">Period: {dataMonthly.year}</div>{/if}
    {#each dataMonthly.dailyData as daily}
      <h2 class="mt-4 font-semibold">{daily.date}</h2>
      <h2 class="mt-4 font-semibold">{daily.income}</h2>
      <p class="whitespace-pre-wrap leading-7 mt-1">{daily.expense}</p>
      <p class="whitespace-pre-wrap leading-7 mt-1">{daily.count}</p>
    {/each}
  </article>
{/if}