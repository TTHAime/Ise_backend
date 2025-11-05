<script lang="ts">
	import logo from '$lib/assets/expenTrack_logo.svg';
	import Auth from '$lib/components/auth.svelte';

	let authShow = $state(false);
	let mode = $state<'login' | 'signup'>('login');
	let mobileOpen = $state(false);

	const openAuth = (m: 'login' | 'signup') => {
		mode = m;
		authShow = true;
		mobileOpen = false;
	};
	const closeAuth = () => (authShow = false);
	const afterLogin = () => (authShow = false);
	const afterSignup = () => (authShow = false);
</script>

<div class="min-h-dvh bg-[#FFF8EF]">
	<div class="relative min-h-dvh">
		<!-- blobs -->
		<div
			class="pointer-events-none absolute -left-24 -top-28 h-[360px] w-[460px] rotate-[10deg]
                rounded-[40%_60%_55%_45%/60%_40%_60%_40%]
                bg-[radial-gradient(circle_at_30%_30%,#57C785_0%,#2A7B9B_60%,#2A7B9B_100%)]
                shadow-[0_30px_60px_rgba(42,123,155,0.25)]"
		></div>
		<div
			class="pointer-events-none absolute -bottom-36 -right-28 h-[420px] w-[500px] -rotate-[8deg]
                rounded-[60%_40%_50%_50%/40%_60%_45%_55%]
                bg-[radial-gradient(circle_at_70%_70%,#57C785_0%,#2A7B9B_60%,#2A7B9B_100%)]
                opacity-90 shadow-[0_30px_60px_rgba(42,123,155,0.2)]"
		></div>

		<!-- NAV -->
		<header class="relative z-10">
			<nav
				class="mx-auto mt-4 max-w-7xl rounded-2xl border border-black/5 bg-white/80 px-4 py-3 shadow-sm backdrop-blur md:px-6"
			>
				<div class="flex items-center justify-between">
					<a href="/" class="flex items-center gap-3">
						<img src={logo} alt="ExpenTrack" class="h-10 w-10 rounded-xl shadow-sm" />
						<span class="text-xl font-extrabold tracking-tight text-[#155e63] sm:text-2xl"
							>ExpenTrack</span
						>
					</a>

					<!-- desktop -->
					<div class="hidden items-center gap-3 sm:flex">
						<button
							class="group relative inline-flex items-center justify-center overflow-hidden rounded-xl
                     bg-gradient-to-br from-teal-300 to-lime-300 p-0.5 text-sm font-medium text-gray-900
                     focus:outline-none focus:ring-4 focus:ring-lime-200"
							onclick={() => openAuth('login')}
							aria-label="Log in"
						>
							<span
								class="relative rounded-[10px] bg-white px-5 py-2 transition-all duration-75 ease-in group-hover:bg-transparent"
							>
								Log in
							</span>
						</button>
						<button
							class="group relative inline-flex items-center justify-center overflow-hidden rounded-xl
                     bg-gradient-to-br from-teal-300 to-lime-300 p-0.5 text-sm font-semibold text-gray-900
                     focus:outline-none focus:ring-4 focus:ring-lime-200"
							onclick={() => openAuth('signup')}
							aria-label="Sign up"
						>
							<span
								class="relative rounded-[10px] bg-white px-5 py-2 transition-all duration-75 ease-in group-hover:bg-transparent"
							>
								Sign up
							</span>
						</button>
					</div>

					<!-- mobile -->
					<button
						class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-white sm:hidden"
						onclick={() => (mobileOpen = !mobileOpen)}
						aria-label="Toggle menu"
					>
						<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none">
							<path
								d="M4 6h16M4 12h16M4 18h16"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
							/>
						</svg>
					</button>
				</div>

				{#if mobileOpen}
					<div class="mt-3 grid gap-2 sm:hidden">
						<button
							class="group relative inline-flex items-center justify-center overflow-hidden rounded-xl
                     bg-gradient-to-br from-teal-300 to-lime-300 p-0.5 text-sm font-medium text-gray-900
                     focus:outline-none focus:ring-4 focus:ring-lime-200"
							onclick={() => openAuth('login')}
						>
							<span
								class="relative w-full rounded-[10px] bg-white px-5 py-2 text-center transition-all group-hover:bg-transparent"
								>Log in</span
							>
						</button>
						<button
							class="group relative inline-flex items-center justify-center overflow-hidden rounded-xl
                     bg-gradient-to-br from-teal-300 to-lime-300 p-0.5 text-sm font-semibold text-gray-900
                     focus:outline-none focus:ring-4 focus:ring-lime-200"
							onclick={() => openAuth('signup')}
						>
							<span
								class="relative w-full rounded-[10px] bg-white px-5 py-2 text-center transition-all group-hover:bg-transparent"
								>Sign up</span
							>
						</button>
					</div>
				{/if}
			</nav>
		</header>

		<!-- HERO -->
		<section class="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-12 text-center sm:px-6 sm:pt-16">
			<h1
				class="text-4xl font-black tracking-tight text-neutral-900 sm:text-5xl md:text-6xl"
				style="text-shadow: 0 6px 18px rgba(0,0,0,.18);"
			>
				Welcome to <span class="whitespace-nowrap">ExpenTrack</span>
			</h1>
			<p class="mx-auto mt-4 max-w-2xl text-base text-neutral-700/90 sm:mt-5 sm:text-lg md:text-xl">
				The warm, easy-to-read personal finance app that pairs perfectly with your sign-in screen.
				Track expenses and income, set budgets and saving goals, and see insights instantly.
			</p>

			<div
				class="mt-7 flex flex-col items-center justify-center gap-3 sm:mt-9 sm:flex-row sm:gap-4"
			>
				<button
					class="group relative inline-flex items-center justify-center overflow-hidden rounded-2xl
                 bg-gradient-to-br from-teal-300 to-lime-300 p-0.5 text-base font-semibold text-gray-900
                 focus:outline-none focus:ring-4 focus:ring-lime-200"
					onclick={() => openAuth('signup')}
				>
					<span
						class="relative rounded-[14px] bg-white px-6 py-3 transition-all duration-75 ease-in group-hover:bg-transparent"
					>
						Get started free
					</span>
				</button>
				<button
					class="rounded-2xl border border-black/10 bg-white/85 px-6 py-3 text-base shadow-sm backdrop-blur
                 hover:bg-white"
					onclick={() => openAuth('login')}
					name="Already have an account?"
				>
					Already have an account?
				</button>
			</div>

			<!-- Feature highlights -->
			<div class="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-4 text-left sm:grid-cols-3">
				<div class="rounded-2xl border border-black/5 bg-white/90 p-5 shadow-sm">
					<p class="font-semibold text-[#165f66]">Fast capture</p>
					<p class="mt-1 text-sm text-neutral-600">Add income/expense in seconds.</p>
				</div>
				<div class="rounded-2xl border border-black/5 bg-white/90 p-5 shadow-sm">
					<p class="font-semibold text-[#165f66]">Clear insights</p>
					<p class="mt-1 text-sm text-neutral-600">Beautiful dashboard, instant summaries.</p>
				</div>
				<div class="rounded-2xl border border-black/5 bg-white/90 p-5 shadow-sm">
					<p class="font-semibold text-[#165f66]">Budgets & goals</p>
					<p class="mt-1 text-sm text-neutral-600">Alerts when you’re close to overspending.</p>
				</div>
			</div>
		</section>

		<footer class="relative z-10 py-8 text-center text-xs text-neutral-600 sm:text-sm">
			© {new Date().getFullYear()} ExpenTrack
		</footer>
	</div>
</div>

<!-- Modal: uses your existing auth.svelte -->
<Auth {mode} open={authShow} onClose={closeAuth} login={afterLogin} signup={afterSignup} />
