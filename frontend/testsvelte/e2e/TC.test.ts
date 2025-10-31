import { test as base, expect, Page, Locator } from '@playwright/test';

/* -----------------------------------------------------------------------------
   Global fixture: disable animations + ensure hidden overlays don't eat clicks
----------------------------------------------------------------------------- */
const test = base.extend({
	page: async ({ page }, use) => {
		await page.addStyleTag({
			content: `
        *, *::before, *::after { transition: none !important; animation: none !important; scroll-behavior: auto !important; }
        /* Hidden modals/backdrops must not intercept pointer events */
        [aria-hidden="true"] { pointer-events: none !important; }
      `
		});
		await page.addInitScript(() => {
			const orig = window.matchMedia?.bind(window);
			Object.defineProperty(window, 'matchMedia', {
				configurable: true,
				value: (q: string) =>
					q.includes('prefers-reduced-motion')
						? {
								matches: true,
								media: q,
								onchange: null,
								addListener() {},
								removeListener() {},
								addEventListener() {},
								removeEventListener() {},
								dispatchEvent() {
									return false;
								}
							}
						: orig
							? orig(q)
							: {
									matches: false,
									media: q,
									onchange: null,
									addListener() {},
									removeListener() {},
									addEventListener() {},
									removeEventListener() {},
									dispatchEvent() {
										return false;
									}
								}
			});
		});
		await use(page);
	}
});

/* -----------------------------------------------------------------------------
   Common locators
----------------------------------------------------------------------------- */
const hiddenBackdrop = (page: Page) => page.locator('[title="Modal"][aria-hidden="true"]');

// Login
const loginButton = (page: Page) => page.getByRole('button', { name: /^log in$/i });
// Prefer a role/testid if available; fallback to stable text inside the dialog:
const loginDialog = (page: Page) => page.getByText('LOG IN Email Your password');

// Sign up
const signUpButton = (page: Page) => page.getByRole('button', { name: 'Sign up' });

const signUpDialog = (page: Page) => page.getByText('SIGN UP Email Username');

/* -----------------------------------------------------------------------------
   Helpers
----------------------------------------------------------------------------- */
async function ensureBackdropNotBlocking(page: Page) {
	const bd = hiddenBackdrop(page);
	await bd.waitFor({ state: 'detached', timeout: 400 }).catch(() => {});
	await expect(bd)
		.toBeHidden({ timeout: 400 })
		.catch(() => {});
}

/** Bounded, idempotent open via button -> dialog visible. */
async function openModalByButton(page: Page, button: Locator, dialogMarker: Locator) {
	if (await dialogMarker.isVisible()) return;

	await ensureBackdropNotBlocking(page);
	await button.scrollIntoViewIfNeeded();

	await expect(async () => {
		await button.click({ trial: true }).catch(() => {});
		await button.click();
		await dialogMarker.waitFor({ state: 'visible', timeout: 800 });
	}).toPass({ timeout: 3500, intervals: [100, 200, 400, 800] });

	await ensureBackdropNotBlocking(page);
}

async function openLoginDialog(page: Page) {
	await openModalByButton(page, loginButton(page), loginDialog(page));
}

async function openSignUpDialog(page: Page) {
	await openModalByButton(page, signUpButton(page), signUpDialog(page));
}

test.describe('UC-01, Login', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('TC-01, main success', async ({ page }) => {
		await openLoginDialog(page);

		const dialog = loginDialog(page);
		await expect(dialog).toBeVisible();

		await dialog.getByLabel(/^email$/i).fill('Singha2608@gmail.com');
		await dialog.getByPlaceholder('password').fill('Pinto2608?');

		
		await dialog
			.locator('button')
			.filter({ hasText: /^LOG IN$/ })
			.click({ timeout: 7000 });

		await expect(page).toHaveURL(/\/home$/);
	});

	test('TC-02, invalid format/empty', async ({ page }) => {
		await openLoginDialog(page);

		const dialog = loginDialog(page);
		await expect(dialog).toBeVisible();

		await dialog.getByLabel(/^email$/i).fill('invalidEmail.com'); // missing '@'
		await dialog.getByPlaceholder('password').fill(''); // empty

		await dialog
			.locator('button')
			.filter({ hasText: /^LOG IN$/ })
			.click({ timeout: 7000 });

		await expect(page).not.toHaveURL(/\/home$/);
		// Uncomment if your UI shows errors:
		// await expect(page.getByText(/invalid email|email is not valid/i)).toBeVisible();
		// await expect(page.getByText(/password required/i)).toBeVisible();
	});

	test('TC-03, invalid credential', async ({ page }) => {
		await openLoginDialog(page);

		const dialog = loginDialog(page);

		await dialog.getByLabel(/^email$/i).fill('NotRegis@gmail.com');
		await dialog.getByPlaceholder('password').fill('wrongPassword2!');

		await dialog
			.locator('button')
			.filter({ hasText: /^LOG IN$/ })
			.click({ timeout: 7000 });

		await expect(page).not.toHaveURL(/\/home$/);
		// await expect(page.getByText(/invalid credentials|email or password/i)).toBeVisible();
	});
});

test.describe('UC-02, Register', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('TC-04, main success scenario (Sign up opens + submit)', async ({ page }) => {
		await openSignUpDialog(page);

		const dialog = signUpDialog(page);
		await expect(dialog).toBeVisible();

		// Adjust label/placeholders to match your actual markup
		await dialog.getByPlaceholder('Username...').fill('Jane Doe');
		await dialog.getByPlaceholder('Expen@user.com').fill('jane.doe+e2e@example.com');
		await dialog.getByPlaceholder('password', { exact: true }).fill('Str0ngPass!1');
		await dialog.getByPlaceholder('Confirm your password').fill('Str0ngPass!1');

		await page.getByTitle('Modal').locator('button').click({ timeout: 7000 });

		await expect(page).not.toHaveURL(/\/home$/);
		//api messege check
	});

	test('TC-05, password mismatch', async ({ page }) => {
		await openSignUpDialog(page);

		const dialog = signUpDialog(page);

		await dialog.getByPlaceholder('Username...').fill('Mismatch User');
		await dialog.getByPlaceholder('Expen@user.com').fill('mismatch+e2e@example.com');
		await dialog.getByPlaceholder('password', { exact: true }).fill('Str0ngPass!1');
		await dialog.getByPlaceholder('Confirm your password').fill('DifferentPass!2');

		await page.getByTitle('Modal').locator('button').click({ timeout: 7000 });

		await expect(page).not.toHaveURL(/\/home$/);
		await expect(page.getByText('Password not match!')).toBeVisible();
	});

	test('TC-06, duplicate fields (email already used)', async ({ page }) => {
		await openSignUpDialog(page);

		const dialog = signUpDialog(page);

		await dialog.getByPlaceholder('Username...').fill('Existing User');
		await dialog.getByPlaceholder('Expen@user.com').fill('Singha2608@gmail.com'); // already registered
		await dialog.getByPlaceholder('password', { exact: true }).fill('Str0ngPass!1');
		await dialog.getByPlaceholder('Confirm your password').fill('Str0ngPass!1');

		await page.getByTitle('Modal').locator('button').click({ timeout: 7000 });

		await expect(page).not.toHaveURL(/\/home$/);
		// await expect(page.getByText(/email already in use|duplicate email/i)).toBeVisible();
	});
});

test.describe('UC-03, Manage Transaction ', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');

		// Log in first
		await openLoginDialog(page);
		const dialog = loginDialog(page);
		await dialog.getByLabel(/^email$/i).fill('Singha2608@gmail.com');
		await dialog.getByPlaceholder('password').fill('Pinto2608?');
		await dialog
			.locator('button')
			.filter({ hasText: /^LOG IN$/ })
			.click({ timeout: 7000 });
		await expect(page).toHaveURL(/\/home$/);
	});

	test('TC-07, create valid', async ({ page }) => {
		//test beforeEach
		// await page.getByRole('button', { name: 'Open user menu' }).click();
		await page.goto('/Transaction');
		await page.locator('button[name="Add Transaction"]').click();
		
		await page.getByRole('radio', { name: 'Expense' }).click();
		const categoryOption = page.getByLabel('Category Select Category📋');
		categoryOption.selectOption( '🍽️ Food & Dining');
		await page.getByRole('textbox', { name: 'Note' }).fill('Lunch at cafe');
		await page.getByRole('spinbutton', { name: 'Amount' }).fill('15.50');

		await page.getByRole('button', { name: 'Add Transaction', exact: true }).click({ timeout: 7000 });
		await page.waitForTimeout(2000);

		await expect(page.getByText('Lunch at cafe')).toBeVisible();
		await expect(page.getByText('15.50')).toBeVisible();

	});
	
	test('TC-08, create invalid', async ({ page }) => {
	});
	test('TC-09, edit transaction', async ({ page }) => {
	});

	test('TC-10, delete confirm', async ({ page }) => {
	});
});
