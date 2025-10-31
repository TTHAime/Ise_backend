<script lang='ts'>
    import { page } from '$app/state';
    import { goto } from '$app/navigation';
    import { ApiRoot } from '$lib/utils/stores';
    import axios from 'axios';
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';

    const code: string = $derived(page.params.code ?? ''); // get code from URL params

    let message: string = $state(''); // message to display to user
    let verified: boolean = $state(false); // whether email is verified successfully

    async function verifyEmail() { // function to verify email
        try{
            const response = await axios.get(`${ApiRoot}auth/email/verify/${encodeURIComponent(code)}`,{
                withCredentials: true, // include cookies
                validateStatus: (s) => s >= 200 && s < 500,
            });

            if(response.status >= 200 && response.status < 300) {
                message = 'Email verified successfully!';
                verified = true;
                setTimeout(() => {
                    goto('/');
                }, 3000);
            } else {
                message = response.data?.message || 'Email verification failed. Please try again.';
                verified = false;
            }
        }catch(err){
            message = 'An error occurred during email verification. Please try again later.';
            verified = false;
        }
    }
            
    onMount(() => { // Call verifyEmail when component mounts
        verifyEmail();
    })

</script>

<div class="min-h-screen flex justify-center items-center p-4">
    <div class="bg-white p-8 sm:p-12 shadow-2xl rounded-xl max-w-lg w-full text-center border-t-4 border-b-emerald-300">
        {#if verified}
            <h1 class="text-3xl font-extrabold text-emerald-500 mb-4 flex flex-col items-center justify-center gap-4">
                <Icon icon="mdi:check" width="24" height="24" color="green" />
                <span class="text-emerald-500">{message}</span>
            </h1>
        {:else}
            <h1 class="text-3xl font-extrabold text-red-500 mb-4 flex flex-col items-center justify-center gap-4">
                <Icon icon="mdi:close-circle" width="24" height="24" color="red" />
                <span class="text-red-500">{message}</span>
            </h1>
        {/if}
    </div>
</div>