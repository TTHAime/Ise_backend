<script lang='ts'>
    import logo from "$lib/assets/expenTrack_logo.svg";
    import userpic from "$lib/assets/userpic.png";//get user pic api later,default
    import { goto } from '$app/navigation';
	import { error, json } from "@sveltejs/kit";
	import { derived } from "svelte/store";
    import { MegaMenu } from "flowbite-svelte";
    import { BellSolid,HomeSolid,UserSettingsSolid,ChartMixedDollarSolid,CalendarPlusSolid,FaceLaughSolid } from "flowbite-svelte-icons";

    let menu = [
        { name: "Home", href: "/home", icon: HomeSolid },
        { name: "Transaction", href: "/Transaction", icon: CalendarPlusSolid },
        { name: "Analytics", href: "/analytics", icon: ChartMixedDollarSolid },
        { name: "About us", href: "/etc", icon: FaceLaughSolid },
        { name: "Setting", href: "/setting/account", icon: UserSettingsSolid },
    ];
    import { blur, slide, scale } from "svelte/transition";

    const props = $props<{user: unknown; loginClick?: () => void; signupClick?: () => void; logoutClick?: () => void}>();

    const user = $derived(props.user);
    const loginClick = $derived(props.loginClick ?? (() => {}));
    const signupClick = $derived(props.signupClick ?? (() => {}));
    const logoutClick = $derived(props.logoutClick ?? (() => {}));

    const displayName = $derived(user?.user.displayName ?? '');

    let notishow = $state(false);

</script>

<style lang="postcss">
    @reference "tailwindcss";
    .header {
	display: flex;
	justify-content: space-between;
	view-transition-name: header;
    }
</style>

<nav class="z-60 sticky header font-mono bg-white bg-auto md:bg-contain mx-4 mt-4 p-4 rounded-md justify-between flex align-middle drop-shadow-lg">
    <img src={logo} alt="ExpenTrack" class="h-13 w-13 ml-2">
    <span class="text-3xl font-bold bg-gradient-to-r from-blue-500 to-green-400 bg-clip-text text-transparent mr-auto ml-4 mt-2">ExpenTrack</span>
    <ul class="mr-2 justify-center align-middle flex items-center space-x-10">
        {#if user}
        <span class="relative inline-block">
            <BellSolid class="h-6 w-6 cursor-pointer hover:text-gray-500" onclick={() => notishow = !notishow} />
            {#if notishow}
            <div class="absolute right-0 mt-2 w-48 rounded-md bg-white shadow-lg z-20">
                <div class="p-4 text-sm text-gray-700">No new notifications</div>
            </div>
            {/if}
        </span>
        <button type="button" class="flex items-center gap-2 cursor-pointer hover:bg-gray-400/50 rounded-sm" aria-label="Open user menu">
            <img src={user?.user.profileImage ?? userpic} alt="User-Pic" class="inline h-8 w-8 rounded-full ring-2 ring-gray-300 dark:ring-gray-500">
            <span class="ml-2">{displayName}</span>
        </button>
        <MegaMenu class="shadow-box px-1" transition={slide} transitionParams={{ duration: 500 }}>
            {#each menu as item}
            <a
            href={item.href}
            class="col-span-full flex items-center gap-2 px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-green-600 dark:hover:text-white"
            >
            <item.icon class="h-4 w-4" />
            <span>{item.name}</span>
        </a>
        {/each}
    </MegaMenu>
    {:else}
        <button class="cursor-pointer hover:bg-gray-400/50 rounded-sm" type="button" onclick={() => goto("")}>Help</button>
        <button class="cursor-pointer hover:bg-gray-400/50 rounded-sm" type="button" onclick={() => goto("/etc")}>About Us</button>
        <button class="cursor-pointer hover:bg-gray-400/50 rounded-sm" type="button" onclick={() => loginClick()}>log in</button>
        <button class="cursor-pointer hover:bg-gray-400/50 rounded-sm" type="button" onclick={() => signupClick()}>Sign up</button>
    {/if}
    </ul>
</nav>