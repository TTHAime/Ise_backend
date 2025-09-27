<script lang='ts'>

    let {
        title = '',
        value = 0,
        format = 'number',
        decimals = 2,
        locale = 'en-GB',
        currency = 'THB',
        currencyDisplay = 'code',
        negative = false

    } = $props<{
        title? : string;
        value?: number | string;
        format?: 'number' | 'currency' | 'string';
        decimals?: number | 2;
        locale?: string;
        currency?: string;
        currencyDisplay?: 'code' | 'symbol' | 'name';
        negative?: boolean;}>();

    function formatCurrency(n : number){
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency,
            currencyDisplay,
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(n).replace(/\u00A0/g, ' ');
    }

    function formatNumber(n: number){
        return new Intl.NumberFormat(locale, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(n);
    }

    const label = $derived(format === 'currency' && typeof value === 'number'? 
        formatCurrency(value) : format === 'number' && typeof value === 'number'?
        formatNumber(value) : String(value));
</script>

<div class="w-full rounded-2xl bg-white ring-1 ring-black/10 shadow-sm p-4 md:p-5">
    <div class="flex items-start justify-between">
        <span class="text-sm text-neutral-600 font-mono">{title}</span>
    </div>

    <div>
        <span class={negative? 'text-rose-500' : 'text-emerald-500'}>{label}</span>
    </div>
</div>