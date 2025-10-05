<script lang="ts">
	import { Modal } from "flowbite-svelte";
    let{ open = false, uploadFunc=(f:File | null)=>{}, onClose=()=>{} } : {open: boolean, uploadFunc?: (f: File|null) => void, onClose?: () => void} = $props();

    let openModal: boolean = $derived(open ?? false);
    let img: File | null = $state(null);
    let previewImgURL: string | null = $state(null);

    function previewImage(e: Event){
        const uploadedImg = (e.target as HTMLInputElement).files?.[0] ?? null;
        img = uploadedImg;
        if(previewImgURL) URL.revokeObjectURL(previewImgURL); //Free Memory from old image.
        previewImgURL = uploadedImg? URL.createObjectURL(uploadedImg) : null;
    }

    async function uploadImage(){
        if(!img || img === null) return;
        try{
            uploadFunc(img);
        }finally{
            if(previewImgURL) URL.revokeObjectURL(previewImgURL);
            img = null;
            closeModal();
        }
    }

    function closeModal(){
        openModal = false;
        onClose();
    }

</script>

<Modal bind:open={openModal} onclose={()=>{closeModal()}} size="md" placement="center" title="Upload image">
    <div class="grid grid-cols-1 w-full justify-center items-center place-content-center">
        <input id="image" type="file" accept="image/*" onchange={(e: Event)=> {previewImage(e)}} class="sr-only" />
        <label for="image" class="inline-flex items-center rounded-lg px-4 py-2 bg-white text-black font-medium ring-1 ring-black/15 hover:bg-white/90 focus:outline-none focus:ring-2 justify-center mt-2 mb-5 hover:cursor-pointer">📷 Choose image</label>
         
        {#if previewImgURL}
            <img src={previewImgURL} alt="Image" class="max-h-64 w-full object-contain rounded-full mb-5" aria-hidden="true" />
        {/if}
        <div class="grid grid-cols-2 gap-4">
            <button class="rounded-xl bg-rose-400 hover:bg-rose-600 px-3 py-2 text-neutral-800 font-semibold font-mono hover:cursor-pointer" onclick={(e)=>{e.preventDefault; closeModal()}}>Cancel</button>
            <button class="rounded-xl bg-green-400 hover:bg-green-600 hover:cursor-pointer text-neutral-700 font-semibold font-mono" disabled={img === null} onclick={()=>{uploadImage()}}>Upload</button>
        </div>
    </div>
</Modal>