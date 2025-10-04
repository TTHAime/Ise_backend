<script lang="ts">
    import logo from "$lib/assets/expenTrack_logo.svg";
	import { label } from "flowbite-svelte";
    import UploadImage from "$lib/components/UploadImage.svelte";

    let userName = $state('');

    //Upload Profile Image
    let imgFile: File | null = $state(null);
    let openUploadModal: boolean = $state(false);
    

    function closeUploadModal() //Close upload image modal
    {
        imgFile = null;
        openUploadModal = false;
    }

    async function updateProfileImage(file: File|null){
        if(file === null) return;
        //API
    }

</script>

<div>
    <div class="flex flex-wrap items-start spacex-5"> <!--Profile-->
        <div class="w-full flex flex-col items-start">
            <span class="text-3xl font-semibold">Account Settings</span>
            <span class=" text-lg font-normal text-neutral-700/50 mt-3">Profile Picture</span>
        </div>
        <div class="w-[20vh] mt-5 flex flex-wrap items-center space-x-5">
            <img src={logo} alt="User-Pic" class="inline mx-1 h-20 w-20 rounded-full ring-2 ring-gray-300 dark:ring-gray-500">
            <button class="mt-4 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded" onclick={()=>{openUploadModal = true}}>Change</button>
        </div>
        <div class="relative w-auto ml-10 mt-6 justify-start"> <!--username-->
            <span class="ml-1 text-lg text-neutral-700/80">Username</span>
            <input type="text" name="username" id="Username" bind:value={userName} placeholder="Username" class="w-auto md:w-full mt-2 rounded-2xl border border-neutral-300 bg-transparent px-2 py-2 text-neutral-800 outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200/60" />
        </div>
    </div>

    <div class="w-auto md:w-full items-start grid grid-cols-2 gap-4"> <!--private account data-->
        <div class="relative w-auto mt-4">
            <span class="ml-1 text-lg text-neutral-700/80">First Name</span>
            <input type="text" name="username" id="Username" placeholder="First Name" class="w-auto md:w-full mt-2 rounded-2xl border border-neutral-300 bg-transparent px-2 py-2 text-neutral-800 outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200/60" />
        </div>
        <div class="relative w-auto mt-4">
            <span class="ml-1 text-lg text-neutral-700/80">Last Name</span>
            <input type="text" name="username" id="Username"  placeholder="Last Name" class="w-auto md:w-full mt-2 rounded-2xl border border-neutral-300 bg-transparent px-2 py-2 text-neutral-800 outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200/60" />
        </div>


        <div class="relative w-auto mt-4">
            <span class="ml-1 text-lg text-neutral-700/80">Email</span>
            <input type="email" name="email" id="email"  placeholder="Email" class="w-auto md:w-full mt-2 rounded-2xl border border-neutral-300 bg-transparent px-2 py-2 text-neutral-800 outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200/60" />
        </div>
    </div>

    <div class="w-auto md:w-full flex flex-wrap items-start mt-10"> <!--localization-->
        <span class=" font-semibold text-3xl w-full">Localization Settings</span>
        <div class="w-auto md:w-full items-start grid grid-cols-2 gap-4">
            <div class="relative w-auto mt-4">
                <span class="ml-1 text-lg text-neutral-700/80">Currency</span>
                <input type="email" name="email" id="email"  placeholder="Currency" class="w-auto md:w-full mt-2 rounded-2xl border border-neutral-300 bg-transparent px-2 py-2 text-neutral-800 outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200/60" />
            </div>
            <div class="relative auto mt-4">
                <span class="ml-1 text-lg text-neutral-700/80">Language</span>
                <input type="email" name="email" id="email"  placeholder="Language" class="w-auto md:w-full mt-2 rounded-2xl border border-neutral-300 bg-transparent px-2 py-2 text-neutral-800 outline-none focus:border-neutral-500 focus:ring-2 focus:ring-neutral-200/60" />
            </div>
        </div>
    </div>

    {#if openUploadModal}
        <UploadImage open={openUploadModal} uploadFunc={updateProfileImage} onClose={closeUploadModal}></UploadImage> 
    {/if}
</div>