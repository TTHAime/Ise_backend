<script lang="ts">
    import jsPDF from 'jspdf';
    import { onMount } from 'svelte';

    
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
    let {y = null, m = null} = $props();
    let year:number = $derived(y ?? null);
    let month:number = $derived(m ?? null);

    //loading and error
    let loading = true;
    let error = '';
    let dataMonthly: reportMonthly | null = null;

    //Load data from API
    async function loadData()
    {   
        if(year === null && month === null) return;
        try{
            const res = await fetch(`http://localhost:4000/report/monthly?year=${year}&month=${month}`, {
                method: 'GET',
                credentials: 'include',
                headers: {Accept: 'application/json'}
            });

            if(!res.ok) throw new Error(`API ${res.status} ${res.statusText}`);
            dataMonthly = (await res.json()) as reportMonthly;
        }catch(e: any){
            error = e?.message ?? 'Failed to load data.';
        }finally{
            loading = false;
        }
    }

    onMount(loadData);

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
        pdf.text(`${m}-${y}`,left,headerTopY);

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

    //Write contents into pdf
    function addTextBlock(pdf: jsPDF, text: string, x: number, y:number, maxWidth: number, lineHeight: number, bottomMargin: number, onNewPage?: () => number): number {
        const pageHeight = pdf.internal.pageSize.getHeight();
        const lines = pdf.splitTextToSize(text, maxWidth) as string[];

        for(const line of lines){
            //Check if current y pos is more than page height
            if(y + lineHeight > pageHeight - bottomMargin){
                pdf.addPage();
                y = onNewPage? onNewPage() : 70;
            }
            pdf.text(line, x, y);
            y += lineHeight;
        }

        return y; //return y for footer.
    }

    //Export to PDF
    function exportPDF(){
        if(!dataMonthly) return;

        const pdf = new jsPDF({unit: 'pt', format: 'a4'});

        //layout
        const left = 40;
        const right = 40;
        const top = 70; //Content start under header
        const bottom = 40; //margin
        const maxWidth = pdf.internal.pageSize.getWidth() - left - right;

        //header on first page
        let y = addHeaderMonthly(pdf, dataMonthly.month, dataMonthly.year, dataMonthly.totalIncome, dataMonthly.totalExpense, dataMonthly.netIncome, dataMonthly.transactionCount);

        pdf.setFontSize(12);
        const lineHeight = 18;

        for(const dailyData of dataMonthly.dailyData){
            if(dailyData.date){
                y = addTextBlock(pdf, dailyData.date, left, y, maxWidth, lineHeight, bottom);
                pdf.setFontSize(12);
                y += 10; // small gap
            }
            
            if(dailyData.income){
                y = addTextBlock(pdf, dailyData.income.toString(), left, y, maxWidth, lineHeight, bottom);
                pdf.setFontSize(12);
                y += 10; // small gap
            }
            
            if(dailyData.expense){
                y = addTextBlock(pdf, dailyData.expense.toString(), left, y, maxWidth, lineHeight, bottom);
                pdf.setFontSize(12);
                y += 10; // small gap
            }
            
            if(dailyData.count){
                y = addTextBlock(pdf, dailyData.count.toString(), left, y, maxWidth, lineHeight, bottom);
                pdf.setFontSize(12);
                y += 10; // small gap
            }
        }

        for(const catBreakdown of dataMonthly.categoryBreakdown){
            if(catBreakdown.categoryId){
                y = addTextBlock(pdf, catBreakdown.categoryId, left, y, maxWidth, lineHeight, bottom);
                pdf.setFontSize(12);
                y += 10;
            }
            
            if(catBreakdown.categoryName){
                y = addTextBlock(pdf, catBreakdown.categoryName, left, y, maxWidth, lineHeight, bottom);
                pdf.setFontSize(12);
                y += 10;
            }
            if(catBreakdown.type){
                y = addTextBlock(pdf, catBreakdown.type, left, y, maxWidth, lineHeight, bottom);
                pdf.setFontSize(12);
                y += 10;
            }
            if(catBreakdown.total){
                y = addTextBlock(pdf, catBreakdown.total.toString(), left, y, maxWidth, lineHeight, bottom);
                pdf.setFontSize(12);
                y += 10;
            }
            if(catBreakdown.count){
                y = addTextBlock(pdf, catBreakdown.count.toString(), left, y, maxWidth, lineHeight, bottom);
                pdf.setFontSize(12);
                y += 10;
            }
            if(catBreakdown.percentage){
                y = addTextBlock(pdf, catBreakdown.percentage.toString(), left, y, maxWidth, lineHeight, bottom);
                pdf.setFontSize(12);
                y += 10;
            }
        }

        addFooter(pdf);

        pdf.save(`report-${dataMonthly.month ?? 'export'}.pdf`);
    }
</script>