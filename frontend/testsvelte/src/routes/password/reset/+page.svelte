<script lang="ts">
	import LoginFrame from '$lib/assets/loginFrame.png';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { ApiRoot } from '$lib/utils/stores';
	import axios from 'axios';

	const token: string = $derived(page.url.searchParams.get('code') ?? '');

	let password: string = $state('');
	let confirm_password: string = $state('');
	let showPassword: boolean = $state(false);
	const type = $derived(showPassword ? 'text' : 'password');
	let touched: boolean = $state(false);
	const passwordMatch: boolean = $derived(
		confirm_password.length > 0 && password === confirm_password
	);
	const canSubmit: boolean = $derived(password.length >= 8 && passwordMatch);

	function toggleHidePass(): void {
		showPassword = !showPassword;
	}

	async function resetPassword(e: SubmitEvent): Promise<void> {
		e.preventDefault();
		if (!canSubmit) return;
		let postData = {
			password: password,
			verificationCode: token
		};
		await axios(`${ApiRoot}auth/password/reset`, {
			method: 'POST',
			headers: { 'Content-type': 'application/json' },
			data: JSON.stringify(postData)
		}).then(function (response) {
			alert('Password reset successfully!');
			// redirect to home page page
			goto('/');
		}).catch(function (error) {
            alert(`Error Message.`);
        });
	}
</script>

<div class="pt-30 item-center flex justify-center px-4">
	<!-- Reset password modal -->
	<div
		class="w-full max-w-md overflow-auto rounded-2xl bg-[#FFF8EF] bg-[length:460px_500px] bg-top bg-no-repeat pt-5 shadow-xl ring-1 ring-black/5"
		style="background-image: url('{LoginFrame}');"
	>
		<p
			class="head-text-shadow mx-auto max-w-sm text-center align-middle text-5xl font-black text-gray-900"
		>
			RESET PASSWORD
		</p>
		<form class="mx-auto max-w-sm align-middle" onsubmit={resetPassword}>
			<div class="relative mt-5 flex h-[150px] w-full flex-col justify-center">
				<span class="mb-2 text-base font-semibold text-gray-900">New Password</span>
				<input
					{type}
					name="NewPass"
					placeholder="New Password"
					required
					bind:value={password}
					class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
				/>
				<span class="mb-2 mt-3 text-base font-semibold text-gray-900">Confirm New Password</span>
				<input
					{type}
					name="ConfirmPass"
					placeholder="New Password"
					required
					bind:value={confirm_password}
					id="confirm_password"
					oninput={() => {
						touched = true;
					}}
					class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
				/>
			</div>
			<div class="mt-5 flex items-center">
				<input
					type="checkbox"
					onchange={toggleHidePass}
					class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
				/>
				<span class="ml-3 font-normal">Hide password</span>
			</div>
			<div class="relative mt-10 flex h-[100px] w-full flex-col items-center">
				<button
					type="submit"
					class="group relative mb-2 me-2 inline-flex items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-teal-300 to-lime-300 p-0.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-4 focus:ring-lime-200 group-hover:from-teal-300 group-hover:to-lime-300 dark:text-white dark:hover:text-gray-900 dark:focus:ring-lime-800"
					disabled={!canSubmit}
				>
					<span
						class="relative rounded-md bg-white px-7 py-2.5 font-bold transition-all duration-75 ease-in group-hover:bg-transparent dark:bg-gray-900 group-hover:dark:bg-transparent"
					>
						Reset Password
					</span>
				</button>
				{#if touched && confirm_password && !passwordMatch}
					<p class="text-sm font-semibold text-red-600" aria-live="polite">
						* Passwords do not match
					</p>
				{/if}
				{#if touched && password && password.length < 8}
					<p class="text-sm font-semibold text-red-600" aria-live="polite">
						* Password must be at least 8 characters long
					</p>
				{/if}
			</div>
		</form>
	</div>
</div>
