<script lang="ts">
    import  ColorPicker  from 'svelte-awesome-color-picker';
    import { colord, Colord } from 'colord'; //color library
    import IconModal from '$lib/components/IconModal.svelte';
	import Icon from '@iconify/svelte';
	import { Modal } from 'flowbite-svelte';
    import { onMount } from 'svelte';

    //Icon and Color Picker
    let color = $state(colord('#E74C3C')); //default color
    let openPickColor = $state(false);  //color picker toggle

    // Category types
    type CompleteCategory = {id: string; name: string; color: string; icon?: string; type: 'INCOME' | 'EXPENSE'; createedAt: string; updatedAt:string; count: number}; //category type with id and count

    // Category form
    let name = $state(''); //category name
    let type: 'INCOME' | 'EXPENSE' = $state('EXPENSE'); //category type

    
    // Icon Picker
    let openIconModal = $state(false); //icon modal toggle
    let icon = $state('lucide:wallet') //selected icon
    type Kind = 'iconify' | 'emoji' |  'url' | 'invalid'; //icon type
    const iconFilter = ['lucide', 'heroicons', 'tabler'];
    const iconifyRegex = /^[a-z0-9-]+$/i; //name format regex
    const emojiRegex = /\p{Extended_Pictographic}/u; //single emoji character regex
    let iconType: Kind = $derived(classifyIcon(icon).kind);
    
    //error handling
    let isError: boolean = $state(false); //error modal toggle
    let errorMsg: string = $state(''); //error message
    let errorTimeOut: ReturnType<typeof setTimeout> | null = null; //timeout for error message (Open error modal for 3 seconds)

    //Add category's attr
    let successAdded: boolean = $state(false); //success add category modal toggle
    let timeSuccess : ReturnType<typeof setTimeout> | null = null; //timeout for success message (Open add category success modal for 3 seconds)
    
    $effect(() => { //auto close modals after 3 seconds both error and success added category
        if(successAdded && !isError){
            if(timeSuccess) clearTimeout(timeSuccess);
            timeSuccess = setTimeout(() => {
                successAdded = false;
            },3000);
        }else if(timeSuccess){ clearTimeout(timeSuccess); timeSuccess = null;}

        if(isError && !successAdded){
            if(errorTimeOut) clearTimeout(errorTimeOut);
            errorTimeOut = setTimeout(() => {
                isError = false;
            },3000);
        }else if(errorTimeOut){ clearTimeout(errorTimeOut); errorTimeOut = null;}
    });
    

    // Category List (fetch from backend)
    let incomeCategories: CompleteCategory[] = $derived<CompleteCategory[]>([]); //list of income categories
    let expenseCategories: CompleteCategory[] = $derived<CompleteCategory[]>([]); //list of expense categories

    function closeOnScroll(){ //close color picker when scroll
        openPickColor = false;
    }

    function usHttpUrl(url: string): boolean { //validate URL
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
            return false;
        }
    }

    function classifyIcon(v: string): {kind: Kind; value?: string;} { //classify icon type
        const value = (v ?? '').trim();
        if(!value) return {kind: 'invalid'};

        //iconify icon (prefix:name)
        const parts = value.split(':');
        if(parts.length === 2) {
            const [prefix, name] = parts;
            if(iconifyRegex.test(name) && iconFilter.includes(prefix.toLowerCase())) { //validate prefix and name
                return {kind: 'iconify', value: `${prefix}:${name}`.toLowerCase()};
            }
        }

        //emoji (single emoji character)
        if(emojiRegex.test(value)) {
            return {kind: 'emoji', value};
        }

        //url (valid http/https URL or data image)
        if(usHttpUrl(value) || /^data:image\/[a-z.+-]+;base64,/i.test(value)) { //data:image/png;base64,... (e.g. data:image/jpeg;base64,/9j/…) 
            return {kind: 'url', value};
        }

        return {kind: 'invalid'};
    }

    function handlePickIcon(value: string) { //handle icon pick
        icon = value;
    }

    //Add Category API call here
    async function addCategory(){ 
        let postData = {
            color : color.toHex(),
            icon  : iconType === 'invalid' ? null : icon,
            name :   name,
            type :   type
        }

        try{ //Exception handling
            const response = await fetch('http://localhost:4000/category', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(postData)
            })
            if(!response.ok){
                const data = await response.json().catch(() => null);
                isError = true; //show error modal
                if(Array.isArray(data?.errors)){ //validation errors from backend
                    errorMsg = data.errors.map((e: any) => e.message).join('; \n'); //combine all error messages
                }
                return;
            }
            successAdded = true; //show success modal
            allFetchCategories(); //refresh category list
        }catch(e){ //network error or other exceptions
            isError = true;
            errorMsg = e instanceof Error ? e.message : 'An unknown error occurred';

        }

    }

    async function fetchIncomeCategories(){
        const response = await fetch('http://localhost:4000/category?type=INCOME', {
            method: 'GET',
            credentials: 'include',
        });
        if(!response.ok){
            console.error('Error fetching complete categories:', response.statusText);
            return;
        }
        const data = await response.json();
        if(!data || !Array.isArray(data.categories)){
            console.error('Invalid data format for complete categories', data);
            incomeCategories = [];
            return;
        }

        console.log('Fetched categories:', data.categories);
        incomeCategories = data.categories.map((c: any) => ({
            id: c.id,
            name: c.name,
            color: c.color,
            icon: c.icon,
            type: c.type,
            createedAt: c.createdAt,
            updatedAt: c.updatedAt,
            count: c._count.transactions || 0
        }));
    }
    async function fetchExpenseCategories(){
        const response = await fetch('http://localhost:4000/category?type=EXPENSE', {
            method: 'GET',
            credentials: 'include',
        });
        if(!response.ok){
            console.error('Error fetching complete categories:', response.statusText);
            return;
        }
        const data = await response.json();
        if(!data || !Array.isArray(data.categories)){
            console.error('Invalid data format for complete categories', data);
            incomeCategories = [];
            return;
        }

        console.log('Fetched categories:', data.categories);
        expenseCategories = data.categories.map((c: any) => ({
            id: c.id,
            name: c.name,
            color: c.color,
            icon: c.icon,
            type: c.type,
            createedAt: c.createdAt,
            updatedAt: c.updatedAt,
            count: c._count.transactions || 0
        }));
    }

    async function allFetchCategories(){
        await fetchIncomeCategories(); //fetch categories,which type = INCOME, on mount
        await fetchExpenseCategories(); //fetch categories,which type = EXPENSE, on mount
    }
    
    onMount(() => {
        allFetchCategories(); //fetch categories on mount
    });

</script>

<svelte:window onscroll={closeOnScroll} onkeydown={(e) => {if(openPickColor && e.key === 'Escape') openPickColor = false;}}></svelte:window>

<div class="w-auto md:w-full items-start p-3 justify-start">
    <h2 class="text-xl font-semibold w-full">Create a new Category</h2>
    <div class="flex flex-wrap justify-start items-start w-full"> <!--header-->
        <div class="mt-6 items-start"> 
            <div> <!--Icon Color-->
                <label for="icon-label" class="block text-sm text-neutral-500">Color</label>

                <button type="button" class="flex mt-3 w-[72px] h-[72px] rounded-2xl bg-white ring-1 ring-black/15 items-center justify-center hover:cursor-pointer" aria-label="Pick icon color" title="Pick icon color" onclick={() => { openPickColor = !openPickColor; }}>
                    <!-- <ColorPicker bind:color /> -->
                    <span class="block w-10 h-10 rounded-full ring-1 ring-black/20" style={`background:${color.toHex()}`}></span>
                </button>
                {#if openPickColor}
                    <div class="fixed inset-0 z-40" onclick={() => (openPickColor = false)} aria-hidden="true"></div>
                    <div class="absolute z-50 mt-2 p-3 rounded-xl border bg-white dark:bg-neutral-900 shadow-lg">
                        <ColorPicker bind:color />
                    </div>
                {/if}
            </div>
        </div>

        <div class="mt-6 ml-5 items-start"> 
            <div> <!-- Icon picker -->
                <label for="icon-label" class="block text-sm text-neutral-500">Icon</label>

                <button type="button" class="flex mt-3 w-[72px] h-[72px] rounded-2xl bg-white ring-1 ring-black/15 items-center justify-center hover:cursor-pointer" aria-label="Pick icon color" title="Pick icon color" onclick={() => { openIconModal = !openIconModal; }}>
                    {#if iconType === 'iconify'}
                        <Icon icon={icon} class="w-10 h-10 text-neutral-800" aria-hidden={true} />
                    {:else if iconType === 'emoji'}
                        <span class="text-3xl">{icon}</span>
                    {:else if iconType === 'url'}
                        <img src={icon} alt="Selected Icon" class="w-10 h-10 object-contain rounded" onerror={(e) => (e.target as HTMLImageElement).src = ''} />
                    {:else}
                        <Icon icon="lucide:question-mark-circle" class="w-10 h-10 text-neutral-300" aria-hidden={true} />
                    {/if}
                </button>
                {#if openIconModal}
                    <div class="fixed inset-0 z-40" onclick={() => (openIconModal = false)} aria-hidden="true"></div>
                    <IconModal open={openIconModal} onPick={handlePickIcon} onClose={() => {openIconModal = false}} />
                {/if}
            </div>
        </div>
        <div class="mt-6 items-start justify-start ml-auto md:ml-10"> <!--Category Name input-->
            <label for="cat-name" class="block text-sm text-neutral-500">Name</label>
            <input type="text" name="cat-name" id="category" class="w-[400px] h-[50px] mt-3 rounded-2xl border border-neutral-300 bg-transparent px-2 py-2 text-neutral-800 outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200/60" placeholder="Category Name" bind:value={name}/>
        </div>

        <div> <!--Category type-->
            <div class="mt-6 justify-start md:ml-10 ml-auto items-start">
                <label for="cat-type" class="block text-sm text-neutral-500">Type</label>
                <div class="w-[150px] mt-3 rounded-2xl border border-neutral-300 bg-transparent px-2 py-2 text-neutral-800 outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200/60">
                    <select name="cat-type" id="cat-type" class="w-full outline-none text-neutral-800" bind:value={type}>
                        <option disabled selected value class="text-neutral-800/50">Select Type</option>
                        <option value="EXPENSE" class=" text-neutral-800">Expense</option>
                        <option value="INCOME" class=" text-neutral-800">Income</option>
                    </select>
                </div>
            </div>
        </div>

        <div class="ml-auto md:ml-10 mt-auto md:mt-14 items-center justify-start">
            <button class=" justify-center items-center bg-green-300 h-10 w-auto py-2 px-3 rounded-2xl shadow-sm hover:ring-1 hover:ring-black/15 hover:bg-green-400 hover:cursor-pointer font-semibold text-neutral-700" onclick={()=>{addCategory();}}> <!--Add category button-->
                CREATE Category
            </button>
        </div>
    </div>

    <section class="mt-10 w-full mx-auto justify-start"> <!--Income Category List-->
        <h3 class="text-lg font-semibold">Income Category</h3>
        <div class="max-h-72 overflow-y-auto pr-2 rounded-lg">
            <ul role="list" class="mt-4 divide-y divide-neutral-200">
                {#each incomeCategories as c (c.id)}
                    <li class="flex items-center gap-4 py-3">
                        <span class="inline-block h-6 w-6 rounded-full ring-1 ring-black/10" style={`background:${c.color}`}></span> <!--Category color-->
                        <div class="flex items-center justify-center gap-2 w-20 h-6 rounded-full bg-white">
                            {#if classifyIcon(c.icon ?? '').kind === 'iconify'}
                                <Icon icon={c.icon ?? 'lucide:wallet'} class="w-10 h-10 text-neutral-800" aria-hidden={true} />
                            {:else if classifyIcon(c.icon ?? '').kind === 'emoji'}
                                <span class="text-3xl">{c.icon}</span>
                            {:else if classifyIcon(c.icon ?? '').kind === 'url'}
                                <img src={c.icon ?? ''} alt="Selected Icon" class="w-10 h-10 object-contain rounded" onerror={(e) => (e.target as HTMLImageElement).src = ''} />
                            {:else}
                                <Icon icon="lucide:question-mark-circle" class="w-10 h-10 text-neutral-300" aria-hidden={true} />
                            {/if}
                        </div>
                        <div class="text-neutral-800">
                            {c.name} <!--Category name-->
                        </div>
                        
                        <div class="ml-auto w-40 text-right text-neutral-500"> {c.count} {c.count === 1? 'transaction' : 'transactions'}</div>
                        <button class="p-2 rounded-lg bg-neutral-300 hover:bg-neutral-500 shadow-sm items-center" aria-label="Edit" onclick={()=>{}}>Edit</button>
                        <button class="p-2 rounded-lg bg-rose-200 hover:bg-rose-300 shadow-sm items-center" aria-label="Delete" onclick={()=>{}}>Delete</button>
                    </li>
                {/each}
            </ul>
        </div>
    </section>

    <section class="mt-10 w-full mx-auto justify-start"> <!--Expense Category List-->
        <h3 class="text-lg font-semibold">Expense Category</h3>
        <div class="max-h-72 overflow-y-auto pr-2 rounded-lg">
            <ul role="list" class="mt-4 divide-y divide-neutral-200">
                {#each expenseCategories as c (c.id)}
                    <li class="flex items-center gap-4 py-3">
                        <span class="inline-block h-6 w-6 rounded-full ring-1 ring-black/10" style={`background:${c.color}`}></span> <!--Category color-->
                        <div class="flex items-center justify-center gap-2 w-20 h-6 rounded-full bg-white">
                            {#if classifyIcon(c.icon ?? '').kind === 'iconify'}
                                <Icon icon={c.icon ?? 'lucide:wallet'} class="w-10 h-10 text-neutral-800" aria-hidden={true} />
                            {:else if classifyIcon(c.icon ?? '').kind === 'emoji'}
                                <span class="text-3xl">{c.icon}</span>
                            {:else if classifyIcon(c.icon ?? '').kind === 'url'}
                                <img src={c.icon ?? ''} alt="Selected Icon" class="w-10 h-10 object-contain rounded" onerror={(e) => (e.target as HTMLImageElement).src = ''} />
                            {:else}
                                <Icon icon="lucide:question-mark-circle" class="w-10 h-10 text-neutral-300" aria-hidden={true} />
                            {/if}
                        </div>
                        <div class="text-neutral-800">
                            {c.name} <!--Category name-->
                        </div>
                        <div class="ml-auto w-40 text-right text-neutral-500"> {c.count} {c.count === 1? 'transaction' : 'transactions'}</div>
                        <button class="p-2 rounded-lg bg-neutral-300 hover:bg-neutral-500 shadow-sm items-center" aria-label="Edit" onclick={()=>{}}>Edit</button>
                        <button class="p-2 rounded-lg bg-rose-200 hover:bg-rose-300 shadow-sm items-center" aria-label="Delete" onclick={()=>{}}>Delete</button>
                    </li>
                {/each}
            </ul>
        </div>
    </section>

    {#if successAdded}
        <Modal open={successAdded} onclose={() => successAdded = false} title="Success" size="sm">
            <p class="text-sm text-green-600 font-mono">Category added successfully!</p>
        </Modal>
    {/if}

    {#if isError}
        <Modal open={isError} onclose={() => isError = false} title="Failed" size="sm">
            <p class="text-sm text-red-600 font-mono">{errorMsg}</p>
        </Modal>
    {/if}
</div>