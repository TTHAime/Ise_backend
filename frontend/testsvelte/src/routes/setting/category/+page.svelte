<script lang="ts">
    import  ColorPicker  from 'svelte-awesome-color-picker';
    import { colord, Colord } from 'colord'; //color library
    import IconModal from '$lib/components/IconModal.svelte';
	import Icon from '@iconify/svelte';
	import { Modal } from 'flowbite-svelte';
    import { onMount } from 'svelte';
	import { updated } from '$app/state';
    import { ApiRoot } from '$lib/utils/stores';
	import axios from 'axios';

    //Icon and Color Picker
    let color = $state(colord('#E74C3C')); //default color
    let openPickColor = $state(false);  //color picker toggle
    let openPickColorUpdate = $state(false);  //color picker toggle for update

    // Category types
    type CompleteCategory = {id: string; name: string; color: string; icon?: string; type: 'INCOME' | 'EXPENSE'; createedAt: string; updatedAt:string; count: number}; //category type with id and count

    // Category form
    let name = $state(''); //category name
    let type: 'INCOME' | 'EXPENSE' = $state('EXPENSE'); //category type

    
    // Icon Picker
    let openIconModal = $state(false); //icon modal toggle
    let openIconModalUpdate = $state(false); //icon modal toggle for update
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

    //Update category
    let updatingCategoryId: string | null = $state(null); //id of category being updated, null if adding new category
    let nameUpdateCategory: string = $state(''); //name of category being updated
    let typeUpdateCategory: 'INCOME' | 'EXPENSE' = $state('EXPENSE'); //type of category being updated
    let iconUpdateCategory: string = $state('lucide:wallet'); //icon of category being updated
    let iconTypeUpdate: Kind = $derived(classifyIcon(iconUpdateCategory).kind);
    let colorUpdateCategory: Colord = $state(colord('#E74C3C')); //color of category being updated
    let isUpdateModalOpen: boolean = $state(false); //update modal toggle
    let updatedSuccess: boolean = $state(false); //success update category modal toggle
    let timeUpdatedSuccess : ReturnType<typeof setTimeout> | null = null;

    //Delete Category
    let deletingCategoryId: string = $state('');
    let deletingCategoryName : string = $state('');
    let openConfirmDeleteModal: boolean = $state(false); //delete confirmation modal toggle
    let deleteSuccess: boolean = $state(false); //success delete category modal toggle
    let timeDeleteSuccess : ReturnType<typeof setTimeout> | null = null; //timeout for delete success message
    
    
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

        if(updatedSuccess && !isError){
            if(timeUpdatedSuccess) clearTimeout(timeUpdatedSuccess);
            timeUpdatedSuccess = setTimeout(()=> {
                updatedSuccess = false;
            },3000);
        }else if(timeUpdatedSuccess){ clearTimeout(timeUpdatedSuccess); timeUpdatedSuccess = null;}

        if(deleteSuccess && !isError){
            if(timeDeleteSuccess) clearTimeout(timeDeleteSuccess);
            timeDeleteSuccess = setTimeout(()=> {
                deleteSuccess = false;
            },3000);
        }else if(timeDeleteSuccess){ clearTimeout(timeDeleteSuccess); timeDeleteSuccess = null;}
    });
    

    // Category List (fetch from backend)
    let incomeCategories: CompleteCategory[] = $derived<CompleteCategory[]>([]); //list of income categories
    let expenseCategories: CompleteCategory[] = $derived<CompleteCategory[]>([]); //list of expense categories

    function closeOnScroll(){ //close color picker when scroll
        if(openPickColor) openPickColor = false;
        if(openPickColorUpdate) openPickColorUpdate = false;
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

    function handlePickIconUpdate(value: string) { //handle icon pick for update
        iconUpdateCategory = value;
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
            const response = await axios(`${ApiRoot}category`, {
                method: "POST",
                withCredentials: true,                      // like fetch { credentials: 'include' }
                headers: { "Content-Type": "application/json" },
                data: postData,                             // axios uses `data` instead of `body`
                validateStatus: () => true,
            });
            if(!(response.status >= 200 && response.status <= 300)){
                const data = (typeof response.data === "object" ? response.data : null) as any;
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
        const response = await axios(`${ApiRoot}category?type=INCOME`, {
            method: "GET",
            withCredentials: true,
            validateStatus: () => true,
        });
        if(!(response.status >= 200 && response.status <= 300)){
            console.error('Error fetching complete categories:', response.statusText);
            return;
        }
        const data = await response.data;
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
        const response = await axios(`${ApiRoot}category?type=EXPENSE`, {
            method: "GET",
            withCredentials: true,
            validateStatus: () => true,
        });
        if(!(response.status >= 200 && response.status <= 300)){
            console.error('Error fetching complete categories:', response.statusText);
            return;
        }
        const data = await response.data;
        if(!data || !Array.isArray(data.categories)){
            console.error('Invalid data format for complete categories', data);
            incomeCategories = [];
            return;
        }

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

    function openUpdateCategoryModal(cat: CompleteCategory){ //open update category modal and set values
        updatingCategoryId = cat.id;
        nameUpdateCategory = cat.name;
        typeUpdateCategory = cat.type;
        iconUpdateCategory = cat.icon ?? 'lucide:wallet';
        colorUpdateCategory = colord(cat.color);
        isUpdateModalOpen = true;
    }

    function closeUpdateCategoryModal(){ //Close update category modal and reset values
        updatingCategoryId = null;
        nameUpdateCategory = '';
        typeUpdateCategory = 'EXPENSE';
        iconUpdateCategory = 'lucide:wallet';
        colorUpdateCategory = colord('#E74C3C');
        isUpdateModalOpen = false;
    }

    async function updateCategory(){
        if(updatingCategoryId === null) return; //no category to update
        let updateData = {
            name: nameUpdateCategory.trim(),
            color: colorUpdateCategory.toHex(),
            icon : iconTypeUpdate === 'invalid'? 'lucide:wallet' : iconUpdateCategory,
            type: typeUpdateCategory
        }

        const response = await axios(`${ApiRoot}category/${updatingCategoryId}`,{
            method: "PATCH",
            withCredentials: true,
            headers: { "Content-Type": "application/json" },
            data: updateData,
            validateStatus: () => true
        })

        if(!(response.status >= 200 && response.status <= 300)){
            const data = (typeof response.data === "object" ? response.data : null) as any;
            isError = true; //show error modal
            if(Array.isArray(data?.errors)){ //validation errors from backend
                errorMsg = data.errors.map((e: any) => e.message).join('; \n'); //combine all error messages
            }
            return;
        }
        updatedSuccess = true; //show success modal
        allFetchCategories(); //refresh category list
        closeUpdateCategoryModal(); //close update modal
    }


    async function deleteCategory(id: string){
        if(id === null || id === '') return;
        const response = await axios(`${ApiRoot}category/${id}`,{
            method: "DELETE",
            withCredentials: true,
            validateStatus: () => true
        })
        if(!(response.status >= 200 && response.status <= 300)){
            errorMsg = 'Failed to delete category';
            isError = true;
            return;
        }
        deleteSuccess = true;
        closeCategoryDeleteModal();
        allFetchCategories();
    }

    function deleteCategoryWithConfirmation(cat: CompleteCategory){
        if(cat === null){
            errorMsg = 'Failed to delete this Category';
            isError = true;
        }
        deletingCategoryId = cat.id;
        deletingCategoryName = cat.name;
        openConfirmDeleteModal = true;
    }
    
    function closeCategoryDeleteModal(){
        deletingCategoryId = '';
        deletingCategoryName = '';
        openConfirmDeleteModal = false;
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
                        <button class="p-2 rounded-lg bg-neutral-300 hover:bg-neutral-500 shadow-sm items-center" aria-label="Edit" onclick={()=>{openUpdateCategoryModal(c);}}>Edit</button>
                        <button class="p-2 rounded-lg bg-rose-200 hover:bg-rose-300 shadow-sm items-center" aria-label="Delete" onclick={()=>{deleteCategoryWithConfirmation(c)}}>Delete</button>
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
                        <button class="p-2 rounded-lg bg-neutral-300 hover:bg-neutral-500 shadow-sm items-center" aria-label="Edit" onclick={()=>{openUpdateCategoryModal(c)}}>Edit</button>
                        <button class="p-2 rounded-lg bg-rose-200 hover:bg-rose-300 shadow-sm items-center" aria-label="Delete" onclick={()=>{deleteCategoryWithConfirmation(c)}}>Delete</button>
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
    {#if isUpdateModalOpen}
        <Modal open={isUpdateModalOpen} onclose={() => closeUpdateCategoryModal()} title="Edit Category" size="lg" class="overflow-visible" >
            <div class="flex flex-wrap justify-start items-center w-full h-full pl-5"> <!--header-->
                <div class="mt-6 items-start"> 
                    <div> <!--Icon Color-->
                        <label for="icon-label" class="block text-sm text-neutral-500">Color</label>

                        <button type="button" class="flex mt-3 w-[72px] h-[72px] rounded-2xl bg-white ring-1 ring-black/15 items-center justify-center hover:cursor-pointer" aria-label="Pick icon color" title="Pick icon color" onclick={() => { openPickColorUpdate = !openPickColorUpdate; }}>
                            <!-- <ColorPicker bind:color /> -->
                            <span class="block w-10 h-10 rounded-full ring-1 ring-black/20" style={`background:${colorUpdateCategory.toHex()}`}></span>
                        </button>
                        {#if openPickColorUpdate}
                            <div class="fixed inset-0 z-40" onclick={() => (openPickColorUpdate = false)} aria-hidden="true"></div>
                            <div class="absolute z-50 mt-2 p-3 rounded-xl border bg-white dark:bg-neutral-900 shadow-lg">
                                <ColorPicker bind:color={colorUpdateCategory} />
                            </div>
                        {/if}
                    </div>
                </div>

                <div class="mt-6 ml-5 items-start"> 
                    <div> <!-- Icon picker -->
                        <label for="icon-label" class="block text-sm text-neutral-500">Icon</label>

                        <button type="button" class="flex mt-3 w-[72px] h-[72px] rounded-2xl bg-white ring-1 ring-black/15 items-center justify-center hover:cursor-pointer" aria-label="Pick icon color" title="Pick icon color" onclick={() => { openIconModalUpdate = !openIconModalUpdate; }}>
                            {#if iconTypeUpdate === 'iconify'}
                                <Icon icon={iconUpdateCategory} class="w-10 h-10 text-neutral-800" aria-hidden={true} />
                            {:else if iconTypeUpdate === 'emoji'}
                                <span class="text-3xl">{iconUpdateCategory}</span>
                            {:else if iconTypeUpdate === 'url'}
                                <img src={iconUpdateCategory} alt="Selected Icon" class="w-10 h-10 object-contain rounded" onerror={(e) => (e.target as HTMLImageElement).src = ''} />
                            {:else}
                                <Icon icon="lucide:question-mark-circle" class="w-10 h-10 text-neutral-300" aria-hidden={true} />
                            {/if}
                        </button>
                        {#if openIconModalUpdate}
                            <div class="fixed inset-0 z-40" onclick={() => (openIconModalUpdate = false)} aria-hidden="true"></div>
                            <IconModal open={openIconModalUpdate} onPick={handlePickIconUpdate} onClose={() => {openIconModalUpdate = false}} />
                        {/if}
                    </div>
                </div>
                <div class="mt-6 items-start justify-start ml-auto md:ml-10"> <!--Category Name input-->
                    <label for="cat-name" class="block text-sm text-neutral-500">Name</label>
                    <input type="text" name="cat-name" id="category" class="w-[400px] h-[50px] mt-3 rounded-2xl border border-neutral-300 bg-transparent px-2 py-2 text-neutral-800 outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200/60" placeholder="Category Name" bind:value={nameUpdateCategory}/>
                </div>

                <div> <!--Category type-->
                    <div class="mt-6 justify-start md:ml-10 ml-auto items-start">
                        <label for="cat-type" class="block text-sm text-neutral-500">Type</label>
                        <div class="w-[150px] mt-3 rounded-2xl border border-neutral-300 bg-transparent px-2 py-2 text-neutral-800 outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200/60">
                            <select name="cat-type" id="cat-type" class="w-full outline-none text-neutral-800" bind:value={typeUpdateCategory}>
                                <option disabled selected value class="text-neutral-800/50">Select Type</option>
                                <option value="EXPENSE" class=" text-neutral-800">Expense</option>
                                <option value="INCOME" class=" text-neutral-800">Income</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="w-full mt-10 mb-5 items-center justify-center md:px-[40vh]">
                    <button class=" justify-center items-center bg-green-300 h-10 w-150px py-2 px-3 rounded-2xl shadow-sm hover:ring-1 hover:ring-black/15 hover:bg-green-400 hover:cursor-pointer font-semibold text-neutral-700" onclick={()=>{updateCategory()}}> <!--Add category button-->
                        Edit Category
                    </button>
                </div>
            </div>
        </Modal>
    {/if}
    {#if updatedSuccess}
        <Modal open={updatedSuccess} onclose={() => updatedSuccess = false} title="Update successfully" size="sm">
            <p class="text-sm text-green-600 font-mono">Category updated successfully!</p>
        </Modal>
    {/if}
    {#if openConfirmDeleteModal}
        <Modal open={openConfirmDeleteModal} onclose={() => openConfirmDeleteModal = false} title="Confirm category deletion" size="sm">
            <div class="grid grid-cols-1 gap-4 items-center justify-center place-items-center">
                <span>Are you sure you want to delete <strong class=" font-semibold text-rose-400">{deletingCategoryName}</strong> category?</span>
                <button type="button" class="justify-center items-center bg-green-300 h-10 w-[20vh] py-2 px-3 rounded-2xl shadow-sm hover:ring-1 hover:ring-black/15 hover:bg-green-400 hover:cursor-pointer font-semibold text-neutral-700" 
                onclick={()=> {deleteCategory(deletingCategoryId)}}>Confirm</button>
            </div>
        </Modal>
    {/if}
    {#if deleteSuccess}
        <Modal open={deleteSuccess} onclose={() => deleteSuccess = false} title="Deleted successfully" size="sm">
            <p class="text-sm text-green-600 font-mono">Category deleted successfully!</p>
        </Modal>
    {/if}
    
</div>