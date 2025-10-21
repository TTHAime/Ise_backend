<script lang="ts">
  import '../app.css';
  import logo from '$lib/assets/expenTrack_logo.svg';
  import Navbar from '$lib/components/Navbar.svelte';
  import Auth from '$lib/components/auth.svelte';

  import { goto, onNavigate } from '$app/navigation';
  import { page } from '$app/stores';             // ใช้ตรวจ path ปัจจุบัน
  import { user, refreshUser, logout } from '$lib/components/auth';
  import { onMount } from 'svelte';

  // onMount(() => { refreshUser(); }); // ถ้าต้องเช็ค session ตอนโหลดแรก

  // View Transitions (คงของเดิม)
  onNavigate((navigation) => {
    if (!document.startViewTransition) return;
    return new Promise((resolve) => {
      document.startViewTransition(async () => {
        resolve();
        await navigation.complete;
      });
    });
  });

  // ========== Auth modal state ==========
  let authShow = $state(false);
  let mode = $state<'login' | 'signup'>('login');

  async function login() {
    authShow = false;
    refreshUser();
  }
  async function signup() {
    authShow = false;
  }

  const openLogin = () => {
    mode = 'login';
    authShow = true;
  };
  const openSignUp = () => {
    mode = 'signup';
    authShow = true;
  };
  const closeAuth = () => {
    authShow = false;
  };

  const logedOut = async () => {
    logout();
    goto('/');
  };

  // children slot (Svelte 5)
  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={logo} />
  <title>ExpenTrack</title>
</svelte:head>

<!-- พื้นหลังรวมของแอป -->
<div class="mybackground flex min-h-screen flex-col">
  <!-- แสดง Navbar ทุกหน้ายกเว้นหน้า Welcome (/) -->
  {#if $page.url.pathname !== '/'}
    <div class="sticky top-0 z-50">
      <Navbar
        user={$user}
        loginClick={openLogin}
        signupClick={openSignUp}
        logoutClick={logedOut}
      />
    </div>
  {/if}

  <!-- โมดัล auth ใช้ร่วมทุกเพจ (รวมถึง Welcome) -->
  <Auth open={authShow} {mode} {login} {signup} onClose={closeAuth} />

  <!-- เนื้อหาเพจ -->
  {@render children?.()}
</div>

<style lang="postcss">
  @reference "tailwindcss";

  /* ==== View Transition (คงของเดิม) ==== */
  @keyframes fade-in { from { opacity: 0; } }
  @keyframes fade-out { to { opacity: 0; } }
  @keyframes slide-from-right { from { transform: translateX(30px); } }
  @keyframes slide-to-left { to { transform: translateX(-30px); } }

  :root::view-transition-old(root) {
    animation:
      90ms cubic-bezier(0.4,0,1,1) both fade-out,
      300ms cubic-bezier(0.4,0,0.2,1) both slide-to-left;
  }
  :root::view-transition-new(root) {
    animation:
      210ms cubic-bezier(0,0,0.2,1) 90ms both fade-in,
      300ms cubic-bezier(0.4,0,0.2,1) both slide-from-right;
  }
</style>