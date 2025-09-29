<script lang="ts">
    import { Modal , Tabs, Search, Button, TabItem } from 'flowbite-svelte';
    import Icon from '@iconify/svelte';
    import EmojiTab from '$lib/components/EmojiTab.svelte';

    // Props
    let {open = false, onPick = (value : string) => {}, onClose = () => {}} = $props();

    // State
    let activeTab: 'curated' | 'search' | 'emoji' | 'url' = $state('curated'); //active tab
    let searchQuery: string = $state('');
    let url = $state(''); //url input
    let selected: string | null = $state(null);


    //curated icons (a small selection of popular icons)
    const curated = [
        'lucide:wallet', 'lucide:shopping-bag', 'lucide:utensils', 'lucide:bus',
        'heroicons:home', 'heroicons:academic-cap', 'heroicons:heart', 'heroicons:gift',
        'tabler:brand-github', 'tabler:brand-google', 'tabler:calendar', 'tabler:chart-pie'
    ];

    //search icons from iconify API
    let searchResults: Array<{prefix: string; name: string}> = $state([]); //search results
    let page = 1;
    let loading = $state(false);
    let hasMore = $state(false);

    const iconFilter = ['lucide', 'heroicons', 'tabler']; //Match backend regex filter

    //debounce function to limit API calls
    let time: any;
    function debouncedSearch() {
        clearTimeout(time);
        time = setTimeout(() => searchIcons(),300); //debounce for 300ms
    }

    
    async function searchIcons(reset = true){ //search icons from iconify API
        if(!searchQuery.trim()) {searchResults = []; hasMore = false; return;}
        loading = true;
        if(reset) {
            page = 1;
            searchResults = [];
        }

        //use Iconify API to search for icons with limit icons per page by defined parameters
        const params = new URLSearchParams({
            query: searchQuery.trim(),          //search term
            limit: '60',                        //icons per page (max results returned)
            page: page.toString(),              //Which page of results
            collections: iconFilter.join(','),   //filter by specific icon sets
        });

        const response = await fetch(`https://api.iconify.design/search?${params.toString()}`);     
        const data = await response.json().catch(() => null);                                       //parse JSON response catch errors
        const icons = (data?.icons ?? []).map((i: any) => {                                         //map results to prefix:name format
            if(typeof i ==='string') {                                                              //if string, split by ':'
                const [prefix, name] = i.split(':');
                return prefix && name ? {prefix, name} : null;
            }
            if(i?.prefix && (i?.name || i?.icon)){
                return {prefix: i.prefix, name: i.name ?? i.icon};
            }

            return null;
        }).filter(Boolean);                                                                         //filter out invalid entries
        searchResults = reset? icons : [...searchResults, ...icons];                                 //append or replace results
        const total = data?.total ?? searchResults.length;                                          //total results from API
        hasMore = searchResults.length < total;                                                     //check if more results available
        loading = false;
    }

    async function loadMore(){          //load more search results
        if(loading || !hasMore) return; //prevent multiple calls
        page += 1;
        await searchIcons(false);       //fetch next page without resetting
    }

    function chooseIcon(prefix: string, name: string){ //select icon and close modal
        selected = `${prefix}:${name}`;
        confirmSelection();            //immediately confirm selection
    }

    function chooseCurated(value: string){ //select icon from curated list
        selected = value;
        confirmSelection();            //immediately confirm selection
    }

    function chooseEmoji(value: string){ //select emoji
        selected = value;
        confirmSelection();            //immediately confirm selection
    }

    function chooseUrl(value: string){  //select icon from URL input
        selected = value;               //e.g https://.../icon.svg
        confirmSelection();            //immediately confirm selection
    }

    function confirmSelection(){        //confirm icon selection
        if(!selected) return;
        onPick(selected);               //call parent callback with selected icon
        onClose();                     //close modal
    }

    

</script>

<Modal bind:open size="xl" onclose={() => onClose()} autoclose={false} class="max-w-3xl min-h-[400px]">
    <div class="p-4 md:p-6">
        <h2 class="text-lg font-semibold mb-4">Choose an Icon</h2>
        <Tabs bind:selected={activeTab} tabStyle="underline" class="mb-4" classes={{active: "text-green-600 border-b-2 border-green-600", inactive: "text-gray-500 hover:text-green-600"}}>
            <TabItem key="curated" title="Curated">Curated</TabItem>
            <TabItem key="search" title="Search">Search</TabItem>
            <TabItem key="emoji" title="Emoji">Emoji</TabItem>
            <TabItem key="url" title="URL">URL</TabItem>
        </Tabs>

        {#if activeTab === 'curated'} <!-- Curated tab -->
            <div class="grid grid-cols-6 gap-3 sm:grid-cols-8 overflow-y-auto">
                {#each curated as name}
                    <!-- svelte-ignore component_name_lowercase -->
                    <button type="button" class="group border rounded-lg p-3 hover:bg-gray-100 items-center justify-center focus:outline-none text-center flex flex-wrap hover:cursor-pointer" onclick={() => chooseCurated(name)} aria-pressed={selected === name} >
                        <Icon icon={name} class="w-24 h-20" aria-hidden={true} />
                        <span class="block mt-1 text-[11px] opacity-70 truncate">{name.split(':')[1]}</span>
                    </button>
                {/each}
                {#if !loading && curated.length === 0}
                    <p class="text-sm text-gray-500 col-span-full text-center">No icons available.</p>
                {/if}
            </div>
            {#if hasMore}
                <div class="flex justify-center mt-4">
                    <Button onclick={loadMore} disabled={loading} class="bg-green-600 hover:bg-green-700 text-white">
                        {loading? 'Loading...': 'Load More'}
                    </Button>
                </div>
            {/if}
        {/if}

        {#if activeTab === 'search'} <!-- Search tab -->
            <div class="space-y-3">
                <Search size="sm" bind:value={searchQuery} placeholder="Search lucide/heroicons/tabler..." oninput={debouncedSearch} class="mt-2" />
                {#if loading && searchResults.length === 0}
                    <p class="text-sm text-gray-500 text-center">Searching...</p>
                {/if}
                <div class="grid grid-cols-6 gap-3 sm:grid-cols-8 overflow-y-auto">
                    {#each searchResults as i}
                        <!-- svelte-ignore component_name_lowercase -->
                        <button type="button" class="group border rounded-lg p-3 hover:bg-gray-100 items-center justify-center focus:outline-none text-center flex flex-wrap hover:cursor-pointer" onclick={() => chooseIcon(i.prefix, i.name)} aria-pressed={selected === `${i.prefix}:${i.name}`} title={`${i.prefix}:${i.name}`}>
                            <Icon icon={`${i.prefix}:${i.name}`} class="w-24 h-20" aria-hidden={true} />    
                            <span class="block mt-1 text-[11px] opacity-70 truncate">{i.name}</span>
                        </button>
                    {/each}
                    {#if !loading && searchResults.length === 0 && searchQuery}
                        <p class="mt-4 text-sm text-gray-500 col-span-full text-center">No icons found.</p>
                    {/if}
                </div>
            </div>
        {/if}

        {#if activeTab === 'emoji'} <!-- Emoji tab -->
            <EmojiTab onPick={chooseEmoji} />
        {/if}

        {#if activeTab === 'url'} <!-- URL tab -->
            <div class="space-y-3">
                <input type="url" id="icon-url" class="w-full border rounded-lg px-3 py-2 focus:underline-none" placeholder="https://.../icon.svg" bind:value={url} />
                <Button size="sm" onclick={() => chooseUrl(url)} disabled={!url.trim()} class="bg-green-600 hover:bg-green-700 text-white">
                    Set URL
                </Button>
                {#if /^https?:\/\//i.test(url)}
                    <img src={url} alt="preview" class="w-24 h-24 ml-2 rounded">
                {/if}
            </div>
        {/if}
    </div>
</Modal>