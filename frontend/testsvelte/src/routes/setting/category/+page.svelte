<script lang="ts">
    import  ColorPicker  from 'svelte-awesome-color-picker';
    import { colord, Colord } from 'colord'; //color library
    import IconModal from '$lib/components/IconModal.svelte';
	import Icon from '@iconify/svelte';


    let color = $state(colord('#E74C3C')); //default color
    let openPickColor = $state(false);  //color picker toggle
    type Category = { id: string; name: string; color: string; count: number; icon?: string; type?: 'income' | 'expense' }; //category type

    // Icon Picker
    let openIconModal = $state(false); //icon modal toggle
    let icon = $state('lucide:wallet') //selected icon
    type Kind = 'iconify' | 'emoji' |  'url' | 'invalid'; //icon type
    const iconifyRegex = /^[a-z0-9-]+$/i; //name format regex
    const emojiRegex = /\p{Extended_Pictographic}/u; //single emoji character regex

    let iconType: Kind = $derived(classifyIcon(icon).kind);

    let categories = $state<Category[]>([
        { id: '1', name: 'เงินเดือน',   color: '#2ecc71', count: 3 },
        { id: '2', name: 'รายได้พิเศษ', color: '#f7d154', count: 6 },
        { id: '3', name: 'ของขวัญ',    color: '#d64b88', count: 1 },
        { id: '4', name: 'อื่นๆ',       color: '#9e9e9e', count: 2 },
        { id: '5', name: 'อื่นๆ',       color: '#9e9e9e', count: 2 },
        { id: '6', name: 'อื่นๆ',       color: '#9e9e9e', count: 2 },
        { id: '7', name: 'อื่นๆ',       color: '#9e9e9e', count: 2 },
        { id: '8', name: 'อื่นๆ',       color: '#9e9e9e', count: 2 },
    ]);

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
            if(iconifyRegex.test(name)) {
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
            <input type="text" name="cat-name" id="category" class="w-[400px] h-[50px] mt-3 rounded-2xl border border-neutral-300 bg-transparent px-2 py-2 text-neutral-800 outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200/60" placeholder="Category Name" />
        </div>

        <div> <!--Category type-->
            <div class="mt-6 justify-start md:ml-10 ml-auto items-start">
                <label for="cat-type" class="block text-sm text-neutral-500">Type</label>
                <div class="w-[150px] mt-3 rounded-2xl border border-neutral-300 bg-transparent px-2 py-2 text-neutral-800 outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200/60">
                    <select name="cat-type" id="cat-type" class="w-full outline-none text-neutral-800">
                        <option disabled selected value class="text-neutral-800/50">Select Type</option>
                        <option value="expense" class=" text-neutral-800">Expense</option>
                        <option value="income" class=" text-neutral-800">Income</option>
                    </select>
                </div>
            </div>
        </div>

        <div class="ml-auto md:ml-10 mt-auto md:mt-14 items-center justify-start">
            <button class=" justify-center items-center bg-green-300 h-10 w-auto py-2 px-3 rounded-2xl shadow-sm hover:ring-1 hover:ring-black/15 hover:bg-green-400 hover:cursor-pointer font-semibold text-neutral-700" onclick={()=>{}}> <!--Add category button-->
                CREATE Category
            </button>
        </div>
    </div>

    <section class="mt-10 w-full mx-auto justify-start"> <!--Income Category List-->
        <h3 class="text-lg font-semibold">Income Category</h3>
        <div class="max-h-72 overflow-y-auto pr-2 rounded-lg">
            <ul role="list" class="mt-4 divide-y divide-neutral-200">
                {#each categories as c (c.id)}
                    <li class="flex items-center gap-4 py-3">
                        <span class="inline-block h-6 w-6 rounded-full ring-1 ring-black/10" style={`background:${c.color}`}></span> <!--Category color-->
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
                {#each categories as c (c.id)}
                    <li class="flex items-center gap-4 py-3">
                        <span class="inline-block h-6 w-6 rounded-full ring-1 ring-black/10" style={`background:${c.color}`}></span> <!--Category color-->
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
</div>