<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import LoginFrame from '$lib/assets/loginFrame.png';
	import { goto } from '$app/navigation';
	import { redirect } from '@sveltejs/kit';
	import { ApiRoot } from '$lib/utils/stores';
	import axios from 'axios';

	let firstField: HTMLInputElement | null = null;
	let overlay: HTMLDivElement | null = $state(null);

	let {
		open = false,
		mode = 'login',
		login = () => {},
		signup = () => {},
		onClose = () => {}
	} = $props();

	let MsgOpen = $state(false);
	let MsgNoti = $state('');
	let MsgKind = $state<'success' | 'error'>('success');

	let email: string = $state('');
	let password: string = $state('');
	let confirmPassword: string = $state('');
	let name: string = $state('');
	let emailForgetPassword: string = $state('');

	async function handleSubmitlogin() {
		
		const postdata = { email, password };

		const response = await axios(`${ApiRoot}auth/login`, {
			method: 'POST',
			withCredentials: true, // like fetch { credentials: 'include' }
			headers: { 'Content-Type': 'application/json' },
			data: postdata, // axios sends JSON for plain objects
			validateStatus: () => true // mimic fetch's response.ok check
		}).then((res) => {
			login();
			navigateToHome();
		}).catch((err) => {
			alert('Error submitting form.',err);
		});
	}

	async function handleSubmitsignup() {		
		const postdata = {
			email,
			password,
			confirmPassword,
			name
		};

		const response = await axios(`${ApiRoot}auth/register`, {
			method: 'POST',
			withCredentials: true, // like fetch { credentials: 'include' }
			headers: { 'Content-Type': 'application/json' },
			data: postdata, // axios sends JSON for plain objects
			validateStatus: () => true // so we can mimic fetch's response.ok
		}).then((res) => {
			navigateToHome();
			signup();
		}).catch((err) => {
			console.log('Error submitting form.',err);
		})
	}

	function loginWithGoogle() {
		// IMPORTANT: use navigation, not fetch — cookies & redirects happen in the browser
		window.location.href = `${ApiRoot}auth/google`;
	}

	function navigateToHome() {
		event?.preventDefault();
		goto('/home');
	}

	function close() {
		mode = 'login';
		onClose();
	}

	function Clicklogin() {
		navigateToHome(); //naja
		login();
	}

	function Clicksignup() {
		navigateToHome(); //naja
		signup();
	}

	function forgotPassClick() {
		mode = 'forgot';
	}

	async function sendVerificationCodeClick() {
		// api
		const postData = { email: emailForgetPassword };

		const response = await axios(`${ApiRoot}auth/password/forgot`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			data: postData,
			validateStatus: () => true
		}).then((res) => {
			mode = 'resetPass';
		}).catch((err) => {
			console.error("Error during sending reset password:", err);
		})
	}

	async function verifyCode() {
		//API
		mode = 'resetPass';
	}

	async function resetPassword() {
		//API
		mode = 'login';
	}

	function clickBackDrop(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			close();
		}
	}

	function passwordhide() {
		var password = document.getElementById('password') as HTMLInputElement | null;
		var confirm_password = document.getElementById('confirm_password') as HTMLInputElement | null;
		if (confirm_password != null) {
			if (confirm_password.type == 'text') {
				confirm_password.type = 'password';
			} else {
				confirm_password.type = 'text';
			}
		}
		if (password != null) {
			if (password.type == 'text') {
				password.type = 'password';
			} else {
				password.type = 'text';
			}
		}
	}

	function Passwordmatch(): boolean {
		var password = document.getElementById('password') as HTMLInputElement;
		var confirm_password = document.getElementById('confirm_password') as HTMLInputElement;
		var validation = document.getElementById('validation') as HTMLParagraphElement;
		if (confirm_password != null) {
			if (password.value != confirm_password.value) {
				validation.textContent = 'Password not match!';
				return false;
			} else {
				validation.textContent = '';
				return true;
			}
		}
		return true;
	}

	function showMsg(noti: string, kind: 'success' | 'error' = 'success') {
		//function for show notification
		MsgNoti = noti;
		MsgKind = kind;
		MsgOpen = true;
		setTimeout(() => (MsgOpen = false), 3000); // Auto close after 3 sec
		goto('/');
	}
</script>

<svelte:window on:keydown={(e) => open && e.key === 'Escape' && close()} />
{#if open}
	<!-- Backdrop + blur -->
	<div
		bind:this={overlay}
		tabindex="-1"
		class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
		transition:fade={{ duration: 100 }}
	></div>

	<!-- Modal login/sign up -->
	<div
		class="h-md max-h-md fixed inset-0 z-50 flex items-center justify-center overflow-auto pb-4 pt-4"
		onclick={clickBackDrop}
		aria-hidden="true"
	>
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="auth-title"
			class="h-full w-full max-w-md overflow-auto rounded-2xl bg-[#FFF8EF] bg-[length:460px_500px] bg-top bg-no-repeat shadow-xl ring-1 ring-black/5"
			transition:scale={{ duration: 160, start: 0.8 }}
			style="background-image: url('{LoginFrame}');"
		>
			<div style="margin-top: 30%;"></div>
			{#if mode === 'login'}
				<!-- title -->
				<p class="head-text-shadow text-center text-6xl font-black text-gray-900">LOG IN</p>
				<div style="margin-top: 20%;"></div>
				<!-- form -->
				<form class="mx-auto max-w-sm" onsubmit={handleSubmitlogin} id="loginform">
					<div class="mb-5">
						<label for="email" class="normal-text mb-2 block text-sm font-medium text-gray-900"
							>Email</label
						>
						<input
							type="email"
							id="email"
							bind:value={email}
							class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
							placeholder="Expen@user.com"
							required
						/>
						<label for="password" class="normal-text mb-2 block text-sm font-medium text-gray-900"
							>Your password</label
						>
						<input
							type="password"
							placeholder="password"
							name=""
							id="password"
							bind:value={password}
							class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
							required
						/>
						<div style="margin-top:15px;"></div>
						<div class="flex justify-between pr-3">
							<div class="flex items-center">
								<input
									checked
									id="checked-checkbox"
									type="checkbox"
									onclick={passwordhide}
									value=""
									class="h-4 w-4 rounded-sm border-gray-300 bg-gray-100 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-blue-600"
								/>
								<label
									for="checked-checkbox"
									class="normal-text ms-2 text-sm font-medium text-gray-900">Hide password</label
								>
							</div>
							<button
								class=" hover:underline"
								onclick={() => {
									forgotPassClick();
								}}>forgot password?</button
							>
						</div>
					</div>
					<div class="mb-5 flex flex-col items-center">
						<button
							type="submit"
							class="group relative mb-2 me-2 inline-flex items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-teal-300 to-lime-300 p-0.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-4 focus:ring-lime-200 group-hover:from-teal-300 group-hover:to-lime-300 dark:text-white dark:hover:text-gray-900 dark:focus:ring-lime-800"
						>
							<!-- for Show naja -->
							<span
								class="relative rounded-md bg-white px-20 py-2.5 font-bold transition-all duration-75 ease-in group-hover:bg-transparent dark:bg-gray-900 group-hover:dark:bg-transparent"
							>
								LOG IN
							</span>
						</button>
						<p class="text-1xl font-thin text-gray-900" style="margin-top: 15px;">OR</p>
						<div class="mt-7 flex flex-col gap-2" style="margin-top: 15px;">
							<button
								onclick={loginWithGoogle}
								class="inline-flex h-10 w-full items-center justify-center gap-2 rounded border border-slate-300 bg-white p-2 text-sm font-medium text-black outline-none focus:ring-2 focus:ring-[#333] focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
								><img
									src="https://www.svgrepo.com/show/475656/google-color.svg"
									alt="Google"
									class="h-[18px] w-[18px]"
								/>Continue with Google
							</button>
						</div>
					</div>
				</form>
			{/if}
			{#if mode === 'signup'}
				<p class="head-text-shadow text-center text-6xl font-black text-gray-900">SIGN UP</p>
				<div style="margin-top: 20%;"></div>
				<!-- form -->
				<form
					class="mx-auto max-w-sm"
					id="signupform"
					onsubmit={(e) => {
						e.preventDefault;
						Passwordmatch() ? handleSubmitsignup() : alert('Password still not match!');
					}}
				>
					<div class="mb-5">
						<label for="email" class="mb-2 block text-sm font-medium text-gray-900">Email</label>
						<input
							type="email"
							id="email"
							bind:value={email}
							class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
							placeholder="name@flowbite.com"
							required
						/>
						<label
							for="email"
							class="normal-text mb-2 block text-sm font-medium text-gray-900"
							style="margin-top: 10px;">Username</label
						>
						<input
							type="text"
							id="username"
							bind:value={name}
							class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
							placeholder="Username..."
							required
						/>
						<label
							for="password"
							class="normal-text mb-2 block text-sm font-medium text-gray-900"
							style="margin-top: 10px;">Password</label
						>
						<input
							type="password"
							placeholder="password"
							name="password"
							id="password"
							bind:value={password}
							class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
							required
						/>
						<label
							for="password"
							class="normal-text mb-2 block text-sm font-medium text-gray-900"
							style="margin-top: 10px;">Confirm Password</label
						>
						<input
							type="password"
							placeholder="Confirm your password"
							name="confirm_password"
							id="confirm_password"
							onkeyup={Passwordmatch}
							bind:value={confirmPassword}
							class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
							required
						/>
						<p
							id="validation"
							class="bold text-center text-sm text-red-500"
							style="margin-top: 15px;"
						></p>
						<div style="margin-top:15px;"></div>
						<div class="flex items-center">
							<input
								checked
								id="checked-checkbox"
								type="checkbox"
								onclick={passwordhide}
								value=""
								class="h-4 w-4 rounded-sm border-gray-300 bg-gray-100 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-blue-600"
							/>
							<label
								for="checked-checkbox"
								class="normal-text ms-2 text-sm font-medium text-gray-900">Hide password</label
							>
						</div>
					</div>
					<div class="mb-5 flex flex-col items-center">
						<button
							type="submit"
							class="group relative mb-2 me-2 inline-flex items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-teal-300 to-lime-300 p-0.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-4 focus:ring-lime-200 group-hover:from-teal-300 group-hover:to-lime-300 dark:text-white dark:hover:text-gray-900 dark:focus:ring-lime-800"
						>
							<!-- for Show naja -->
							<span
								class="relative rounded-md bg-white px-20 py-2.5 font-bold transition-all duration-75 ease-in group-hover:bg-transparent dark:bg-gray-900 group-hover:dark:bg-transparent"
							>
								Sign up
							</span>
						</button>
						<!-- <p class="text-1xl font-thin text-gray-900" style="margin-top: 15px;">OR</p>
						<div class="mt-7 flex flex-col gap-2" style="margin-top: 15px;">
							<button
							class="inline-flex h-10 w-full items-center justify-center gap-2 rounded border border-slate-300 bg-white p-2 text-sm font-medium text-black outline-none focus:ring-2 focus:ring-[#333] focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"><img
								src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google"
								class="h-[18px] w-[18px] ">Continue with
							Google
						</button>
						</div> -->
					</div>
				</form>
			{/if}
			{#if mode === 'forgot'}
				<p
					class="head-text-shadow mx-auto max-w-sm text-center align-middle text-5xl font-black text-gray-900"
				>
					RESET PASSWORD
				</p>
				<form
					class="mx-auto max-w-sm align-middle"
					onsubmit={(e) => {
						{
							e.preventDefault;
						}
					}}
				>
					<div class="relative mt-5 flex h-[150px] w-full flex-col justify-center">
						<span class="mb-2 text-base font-semibold text-gray-900">Email</span>
						<input
							type="Email"
							class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
							placeholder="Email"
							name="Email"
							required
							bind:value={emailForgetPassword}
						/>
					</div>
					<div class="relative flex h-[100px] w-full flex-col items-center">
						<button
							type="submit"
							class="group relative mb-2 me-2 inline-flex items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-teal-300 to-lime-300 p-0.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-4 focus:ring-lime-200 group-hover:from-teal-300 group-hover:to-lime-300 dark:text-white dark:hover:text-gray-900 dark:focus:ring-lime-800"
							onclick={() => {
								sendVerificationCodeClick();
							}}
						>
							<span
								class="relative rounded-md bg-white px-7 py-2.5 font-bold transition-all duration-75 ease-in group-hover:bg-transparent dark:bg-gray-900 group-hover:dark:bg-transparent"
							>
								Send Verification Code
							</span>
						</button>
					</div>
				</form>
			{/if}
			<!-- {#if mode === 'sent'}
			<p class="mx-auto max-w-sm align-middle head-text-shadow text-center text-5xl font-black text-gray-900">RESET PASSWORD</p>
			<form class="mx-auto max-w-sm align-middle" onsubmit={(e) =>{{e.preventDefault;}}}>
				<div class="mt-5 relative flex flex-col h-[150px] w-full justify-center">
					<span class="text-base font-semibold mb-2 text-gray-900">Verification Code</span>
					<input type="Code" 
					name="Code"
					placeholder="Verification code"
					required
					class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500">
				</div>
				<div class="relative flex flex-col items-center w-full h-[100px]">
						<button type="submit" class="group relative mb-2 me-2 inline-flex items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-teal-300 to-lime-300 p-0.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-4 focus:ring-lime-200 group-hover:from-teal-300 group-hover:to-lime-300 dark:text-white dark:hover:text-gray-900 dark:focus:ring-lime-800"
						onclick={() => {verifyCode()}}>
							<span
								class="relative rounded-md bg-white px-7 py-2.5 font-bold transition-all duration-75 ease-in group-hover:bg-transparent dark:bg-gray-900 group-hover:dark:bg-transparent"
							>
								Submit
							</span>
						</button>
					</div>
			</form> -->
			<!-- {/if} -->
			<!-- {#if mode === 'resetPass'}
				<p class="mx-auto max-w-sm align-middle head-text-shadow text-center text-5xl font-black text-gray-900">RESET PASSWORD</p>
				<form class="mx-auto max-w-sm align-middle" onsubmit={(e) =>{{e.preventDefault;}}}>
					<div class="mt-5 relative flex flex-col h-[150px] w-full justify-center">
						<span class="text-base font-semibold mb-2 text-gray-900">New Password</span>
						<input type="Password" name="NewPass" placeholder="New Password"
						required
						class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500">
						<span class="mt-3 text-base font-semibold mb-2 text-gray-900">Confirm New Password</span>
						<input type="Password" name="ConfirmPass" placeholder="New Password"
						required
						class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500">	
					</div>
					<div class="relative flex flex-col mt-10 items-center w-full h-[100px]">
						<button type="submit" class="group relative mb-2 me-2 inline-flex items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-teal-300 to-lime-300 p-0.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-4 focus:ring-lime-200 group-hover:from-teal-300 group-hover:to-lime-300 dark:text-white dark:hover:text-gray-900 dark:focus:ring-lime-800"
							onclick={() => {resetPassword()}}>
								<span
									class="relative rounded-md bg-white px-7 py-2.5 font-bold transition-all duration-75 ease-in group-hover:bg-transparent dark:bg-gray-900 group-hover:dark:bg-transparent"
								>
									Reset Password
								</span>
						</button>
					</div>
				</form>
			{/if} -->
			{#if MsgOpen}
				<div
					role="status"
					aria-live="polite"
					class="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-xl px-4 py-2 text-white shadow-lg"
					transition:fade={{ duration: 200 }}
				>
					<p class="text-sm {MsgKind === 'success' ? 'text-green-600' : 'text-red-600'}">
						{MsgNoti}
					</p>
				</div>
			{/if}
		</div>
	</div>
{/if}
