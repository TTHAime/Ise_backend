<script lang="ts">
	import { onDestroy } from 'svelte';

	export let isOpen = false;
	export let message = '';
	export let type: 'success' | 'error' | 'warning' | 'info' = 'success';
	export let title = '';
	export let onClose: () => void = () => {};
	/** Set true in tests or add <html class="e2e"> to kill animations */
	export let noAnim = false;
	/** Optional test id hook */
	export let testId = 'status-modal';

	let isLoading = false;
	let canClose = false;
	let loadingTimer: ReturnType<typeof setTimeout>;
	let autoCloseTimer: ReturnType<typeof setTimeout>;

	const types = {
		success: { icon: '✓', color: 'green', defaultTitle: 'Success!' },
		error: { icon: '✕', color: 'red', defaultTitle: 'Error' },
		warning: { icon: '⚠', color: 'yellow', defaultTitle: 'Warning' },
		info: { icon: 'ℹ', color: 'blue', defaultTitle: 'Info' }
	} as const;

	// Tailwind-safe literal class maps (no string interpolation)
	const palette = {
		green: {
			ring: 'ring-green-200',
			text600: 'text-green-600',
			bg100: 'bg-green-100',
			spinBorder: 'border-green-200 border-t-green-600',
			btn: 'bg-green-600 hover:bg-green-700'
		},
		red: {
			ring: 'ring-red-200',
			text600: 'text-red-600',
			bg100: 'bg-red-100',
			spinBorder: 'border-red-200 border-t-red-600',
			btn: 'bg-red-600 hover:bg-red-700'
		},
		yellow: {
			ring: 'ring-yellow-200',
			text600: 'text-yellow-600',
			bg100: 'bg-yellow-100',
			spinBorder: 'border-yellow-200 border-t-yellow-600',
			btn: 'bg-yellow-600 hover:bg-yellow-700'
		},
		blue: {
			ring: 'ring-blue-200',
			text600: 'text-blue-600',
			bg100: 'bg-blue-100',
			spinBorder: 'border-blue-200 border-t-blue-600',
			btn: 'bg-blue-600 hover:bg-blue-700'
		}
	} as const;

	$: config = types[type] ?? types.success;
	$: pal = palette[config.color as keyof typeof palette];
	$: displayTitle = title || config.defaultTitle;

	// Prefer reduced motion if requested by user OR tests
	function prefersReducedMotion(): boolean {
		try {
			const mm = window.matchMedia?.('(prefers-reduced-motion: reduce)');
			return !!(noAnim || document.documentElement.classList.contains('e2e') || (mm && mm.matches));
		} catch {
			return !!noAnim;
		}
	}

	$: if (isOpen) {
		// start cycle
		isLoading = true;
		canClose = false;

		clearTimeout(loadingTimer);
		clearTimeout(autoCloseTimer);

		const reduced = prefersReducedMotion();

		// Minimum 1s loading (0 if reduced)
		loadingTimer = setTimeout(
			() => {
				isLoading = false;
				canClose = true;
			},
			reduced ? 0 : 1000
		);

		// Auto close after 2s (0.8s if reduced)
		autoCloseTimer = setTimeout(
			() => {
				handleClose();
			},
			reduced ? 800 : 5000
		);
	} else {
		// reset on close
		clearTimeout(loadingTimer);
		clearTimeout(autoCloseTimer);
		isLoading = false;
		canClose = false;
	}

	onDestroy(() => {
		clearTimeout(loadingTimer);
		clearTimeout(autoCloseTimer);
	});

	function handleClose() {
		if (canClose) onClose();
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget && canClose) onClose();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && canClose) onClose();
	}
</script>

{#if isOpen}
	<div
		data-testid={testId}
		data-state={isLoading ? 'loading' : 'ready'}
		role="dialog"
		aria-modal="true"
		aria-label={displayTitle}
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		on:click={handleBackdropClick}
		on:keydown={handleKeydown}
		tabindex="0"
	>
		<div
			class={`relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5 ${prefersReducedMotion() ? '' : 'animate-slideIn'}`}
		>
			<!-- Close button -->
			<button
				type="button"
				on:click={handleClose}
				disabled={!canClose}
				aria-label="Close"
				class="absolute right-4 top-4 text-gray-400 transition-colors hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
			>
				<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>

			<div class="flex flex-col items-center text-center">
				<!-- Icon with loading animation -->
				<div class="relative mb-4">
					{#if isLoading}
						<div
							class={`h-16 w-16 rounded-full border-4 ${pal.spinBorder} ${prefersReducedMotion() ? '' : 'animate-spin'}`}
						></div>
					{:else}
						<div
							class={`h-16 w-16 rounded-full ${pal.bg100} flex items-center justify-center ${pal.text600} text-3xl font-bold ${prefersReducedMotion() ? '' : 'animate-scaleIn'}`}
						>
							{config.icon}
						</div>
					{/if}
				</div>

				<!-- Message -->
				<h3 class="mb-2 text-xl font-semibold text-gray-900">
					{isLoading ? 'Processing...' : displayTitle}
				</h3>
				<p class="mb-6 text-gray-600">{message}</p>

				<!-- Primary Close button -->
				<button
					type="button"
					on:click={handleClose}
					disabled={!canClose}
					class={`w-full rounded-lg py-3 font-medium shadow-md transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 ${pal.btn} text-white`}
				>
					Close
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(-20px) scale(0.95);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}
	@keyframes scaleIn {
		from {
			transform: scale(0);
		}
		to {
			transform: scale(1);
		}
	}
	.animate-slideIn {
		animation: slideIn 0.3s ease-out;
	}
	.animate-scaleIn {
		animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	/* Global kill switch for E2E */
	:global(html.e2e *),
	:global(html.e2e *::before),
	:global(html.e2e *::after) {
		transition: none !important;
		animation: none !important;
		scroll-behavior: auto !important;
	}
</style>
