import { test as base, expect, Page, Locator } from '@playwright/test';
import { Faker, faker } from '@faker-js/faker';

/* -----------------------------------------------------------------------------
   Global fixture: disable animations + ensure hidden overlays don't eat clicks
----------------------------------------------------------------------------- */
const ApiRoot = 'https://ise-ifwk.onrender.com/';
const mt = {
	type: 'Expense',
	category: '🍽️ Food & Dining',
	date: faker.date.recent({ days: 1 }).toISOString().split('T')[0],
	note: faker.word.noun(),
	amount: String(faker.number.float({ min: 10, max: 100, fractionDigits: 2 }))
};

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
const hiddenBackdrop = (page: Page) => page.getByTitle('Modal');

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

		const responsePromise = page.waitForResponse(`${ApiRoot}auth/login`);
		await dialog
			.locator('button')
			.filter({ hasText: /^LOG IN$/ })
			.click();
		const response = await responsePromise;

		expect(response.ok()).toBeTruthy(); //200 ok is passed
		await expect(page).toHaveURL(/\/home$/); //redirect to home
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
			.click();

		await expect(page).not.toHaveURL(/\/home$/); //do not redirect to home
	});

	test('TC-03, invalid credential', async ({ page }) => {
		await openLoginDialog(page);

		const dialog = loginDialog(page);

		await dialog.getByLabel(/^email$/i).fill('NotRegis@gmail.com');
		await dialog.getByPlaceholder('password').fill('wrongPassword2!');

		const responsePromise = page.waitForResponse(`${ApiRoot}auth/login`);
		await dialog
			.locator('button')
			.filter({ hasText: /^LOG IN$/ })
			.click();
		const response = await responsePromise;

		expect(response.ok()).toBeFalsy(); //not 200 ok
		await expect(page).not.toHaveURL(/\/home$/); //do not redirect to home
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

		const responsePromise = page.waitForResponse(`${ApiRoot}auth/register`);
		await page.locator('#signupform button').click();
		const response = await responsePromise;

		expect(response.ok()).toBeTruthy(); //check 200 ok
		await expect(page).not.toHaveURL(/\/home$/); //redirect to home
		//api messege check
		test('TC-04-1, verify', async ({ page }) => {
			const verifyUrl = response.body.url;
			await page.goto(verifyUrl);

			await expect(page.getByLabel('Verify')).toBeVisible();
			
			//call api get user by Id to check verify status?
			//not test yet
		});
	});


	test('TC-05, password mismatch', async ({ page }) => {
		await openSignUpDialog(page);

		const dialog = signUpDialog(page);

		await dialog.getByPlaceholder('Username...').fill('Mismatch User');
		await dialog.getByPlaceholder('Expen@user.com').fill('mismatch+e2e@example.com');
		await dialog.getByPlaceholder('password', { exact: true }).fill('Str0ngPass!1');
		await dialog.getByPlaceholder('Confirm your password').fill('DifferentPass!2');
		await page.locator('#signupform button').click();

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

		const responsePromise = page.waitForResponse(`${ApiRoot}auth/register`);
		await page.locator('#signupform button').click();
		const response = await responsePromise;

		expect(response.ok()).toBeFalsy(); //not 200 ok == 409
		await expect(page).not.toHaveURL(/\/home$/); //do not redirect to home
		// await expect(page.getByText(/email already in use|duplicate email/i)).toBeVisible();
	});
});

test.describe.serial('UC-03, Manage Transaction ', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');

		// Log in first
		await openLoginDialog(page);
		const dialog = loginDialog(page);
		await dialog.getByLabel(/^email$/i).fill('Singha2608@gmail.com');
		await dialog.getByPlaceholder('password').fill('Pinto2608?');
		const responsePromise = page.waitForResponse(`${ApiRoot}auth/login`);
		await dialog
			.locator('button')
			.filter({ hasText: /^LOG IN$/ })
			.click();
		const response = await responsePromise;

		await page.waitForURL(/\/home$/);
		await page.getByRole('button', { name: 'Open user menu' }).click();
		await page.getByRole('link', { name: 'Transaction' }).click();
	});

	test('TC-07, create valid', async ({ page }) => {
		await page.locator('button[name="Add Transaction"]').click();

		await page.getByRole('radio', { name: 'Expense' }).click();
		const categoryOption = page.getByLabel('Category Select Category📋');
		categoryOption.selectOption('🍽️ Food & Dining');
		await page.getByRole('textbox', { name: 'Date' }).fill(mt.date);
		await page.getByRole('textbox', { name: 'Note' }).fill(mt.note);
		await page.getByRole('spinbutton', { name: 'Amount' }).fill(mt.amount);

		const responsePromise = page.waitForResponse(`${ApiRoot}transaction`);
		await page.getByRole('button', { name: 'Add Transaction', exact: true }).click();
		await page.waitForTimeout(2000);
		const response = await responsePromise;

		expect(response.ok()).toBeTruthy(); //200 ok is passed
		await expect(page.getByText(mt.note)).toBeVisible();
		await expect(page.getByText(mt.amount)).toBeVisible();
	});

	test('TC-08, create invalid', async ({ page }) => {
		await page.locator('button[name="Add Transaction"]').click();

		//not choose category
		await page.getByRole('textbox', { name: 'Date' }).fill(mt.date);
		await page.getByRole('textbox', { name: 'Note' }).fill(mt.note);
		await page.getByRole('spinbutton', { name: 'Amount' }).fill('50');

		await page.getByRole('button', { name: 'Add Transaction', exact: true }).click();

		//should show error message
		await expect(page.getByText('Please select a category.')).toBeVisible();
		await page.getByText('Close').click();
		await expect(page.getByText('Add Transaction Expense')).toBeVisible();

		//future date
		await page.getByRole('radio', { name: 'Expense' }).click();
		const categoryOption = page.getByLabel('Category Select Category📋');
		categoryOption.selectOption('🍽️ Food & Dining');
		const futureDate = new Date();
		futureDate.setDate(futureDate.getDate() + 10); // 10 days in the future
		const futureDateString = futureDate.toISOString().split('T')[0];
		await page.getByRole('textbox', { name: 'Date' }).fill(futureDateString);
		await page.getByRole('textbox', { name: 'Note' }).fill(mt.note);
		await page.getByRole('spinbutton', { name: 'Amount' }).fill('50');

		await page.getByRole('button', { name: 'Add Transaction', exact: true }).click();

		//should show error message
		await expect(page.getByText('Please select no future date')).toBeVisible();
		await page.getByText('Close').click();
		await expect(page.getByText('Add Transaction Expense')).toBeVisible();

		//empty amount
		//already selected expense
		categoryOption.selectOption('🍽️ Food & Dining');
		await page.getByRole('textbox', { name: 'Date' }).fill(mt.date);
		await page.getByRole('textbox', { name: 'Note' }).fill(mt.note);
		await page.getByRole('spinbutton', { name: 'Amount' }).fill('');

		await page.getByRole('button', { name: 'Add Transaction', exact: true }).click();

		//should show error message
		await expect(page.getByText('Please enter a valid amount')).toBeVisible();
		await page.getByText('Close').click();
		await expect(page.getByText('Add Transaction Expense')).toBeVisible();
	});
	test('TC-09, edit transaction', async ({ page }) => {
		await page.locator('button').filter({ hasText: mt.category }).first().click();

		//edit
		await page.getByRole('radio', { name: 'Income' }).click();
		const categoryOption = page.getByLabel('Category Select Category💼');
		categoryOption.selectOption('🎁 Gift');
		await page.getByRole('textbox', { name: 'Note' }).fill('Edited ' + mt.note);
		await page.getByRole('spinbutton', { name: 'Amount' }).fill(String(parseInt(mt.amount) + 5));

		const responsePromise = page.waitForResponse((response) =>
			response.url().startsWith(`${ApiRoot}transaction`)
		);
		await page.getByRole('button', { name: 'Update Transaction' }).click();
		await expect(page.getByText('Transaction updated successfully.')).toBeVisible();
		await page.getByText('Close').click();
		const response = await responsePromise;

		expect(response.ok()).toBeTruthy(); //200 ok is passed
		await expect(page.getByText('Edited ' + mt.note)).toBeVisible();
	});

	test('TC-10, delete confirm', async ({ page }) => {
		await page.locator('button').filter({ hasText: mt.category }).first().click();

		const responsePromise = page.waitForResponse((response) =>
			response.url().startsWith(`${ApiRoot}transaction`)
		);
		await page.getByRole('button', { name: 'Delete' }).click();
		const response = await responsePromise;

		await expect(page.getByText('Transaction deleted')).toBeVisible();
		await page.getByText('Close').click();
		await expect(response.ok()).toBeTruthy(); //200 ok is passed
	});
});
test.describe('UC-04, Reciept', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');

		// Log in first
		await openLoginDialog(page);
		const dialog = loginDialog(page);
		await dialog.getByLabel(/^email$/i).fill('Singha2608@gmail.com');
		await dialog.getByPlaceholder('password').fill('Pinto2608?');
		const responsePromise = page.waitForResponse(`${ApiRoot}auth/login`);
		await dialog
			.locator('button')
			.filter({ hasText: /^LOG IN$/ })
			.click();
		const response = await responsePromise;

		await page.waitForURL(/\/home$/);
		await page.getByRole('button', { name: 'Open user menu' }).click();
		await page.getByRole('link', { name: 'Transaction' }).click();
	});
	test('TC-11, OCR success', async ({ page }) => {
		await page.locator('button[name="Add Transaction"]').click();

		// Upload receipt
		const [fileChooser] = await Promise.all([
			page.waitForEvent('filechooser'),
			await page.getByRole('button', { name: 'Add Receipt' }).click(),
		]);
		await fileChooser.setFiles('e2e/assets/receipt_test.jpg');
		await expect(page.getByText('receipt_test.jpg')).toBeVisible();

		const response =  page.waitForResponse(`${ApiRoot}transaction/slip`);
		await page.getByRole('button', { name: 'Add Transaction', exact: true }).click();
		const res = await response;

		await expect(page.getByText('From Receipt')).toBeVisible();
		//test data in edit modal and complete it
		//not finish
	});
});
test.describe.serial('UC-05, Manage Categories', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');

		// Log in first
		await openLoginDialog(page);
		const dialog = loginDialog(page);
		await dialog.getByLabel(/^email$/i).fill('Singha2608@gmail.com');
		await dialog.getByPlaceholder('password').fill('Pinto2608?');
		const responsePromise = page.waitForResponse(`${ApiRoot}auth/login`);
		await dialog
			.locator('button')
			.filter({ hasText: /^LOG IN$/ })
			.click();
		const response = await responsePromise;

		await page.waitForURL(/\/home$/);
		await page.getByRole('button', { name: 'Open user menu' }).click();
		await page.getByRole('link', { name: 'Setting' }).click();
	});
	test('TC-12, add unique', async ({ page }) => {
		await page.getByRole('link', { name: 'Category' }).click();
		// await page.getByRole('button', { name: 'Pick icon color' }).first().click();
		// await page.locator('.absolute').click();

		await page.getByRole('button', { name: 'Pick icon color' }).nth(1).click();
		await page.getByRole('button', { name: 'heart' }).click();
		await page.waitForTimeout(5000);

		await page.getByRole('textbox', { name: 'Category Name' }).fill('Test Category');

		const categoryOption = page.getByLabel('Type');
		categoryOption.selectOption('INCOME');

		const responsePromise = page.waitForResponse(`${ApiRoot}category`);
		await page.getByRole('button', { name: 'CREATE Category' }).click();
		const response = await responsePromise;

		//expect
		expect(response.ok()).toBeTruthy(); //200 ok is passed
		await expect(page.getByText('Test Category')).toBeVisible();
	});
	test('TC-13, duplicate name', async ({ page }) => {
		await page.getByRole('link', { name: 'Category' }).click();

		await page.getByRole('textbox', { name: 'Category Name' }).fill('Test Category');

		const categoryOption = page.getByLabel('Type');
		categoryOption.selectOption('INCOME');

		const responsePromise = page.waitForResponse(`${ApiRoot}category`);
		await page.getByRole('button', { name: 'CREATE Category' }).click();
		const response = await responsePromise;

		//expect
		expect(response.ok()).toBeFalsy(); //409 conflict
		await expect(page.getByText('Failed')).toBeVisible();
	});
	test('TC-13-1, delete Category', async ({ page }) => {
		await page.getByRole('link', { name: 'Category' }).click();

		await expect(page.getByText('Test Category')).toBeVisible();
		await page
			.getByRole('listitem')
			.filter({ hasText: 'Test Category' })
			.getByLabel('Delete')
			.click();

		const responsePromise = page.waitForResponse((response) =>
			response.url().startsWith(`${ApiRoot}category`)
		);
		await page.getByRole('button', { name: 'Confirm' }).click();
		const response = await responsePromise;

		expect(response.ok()).toBeTruthy(); //200 ok is passed
		await page
			.getByRole('dialog')
			.filter({ hasText: 'Deleted successfully Close' })
			.getByLabel('Close')
			.click();
		await page.waitForTimeout(2000);
		await expect(page.getByText('Test Category')).toBeHidden();
	});
});
test.describe.serial('UC-06 & 07, Reports', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');

		// Log in first
		await openLoginDialog(page);
		const dialog = loginDialog(page);
		await dialog.getByLabel(/^email$/i).fill('Singha2608@gmail.com');
		await dialog.getByPlaceholder('password').fill('Pinto2608?');
		const responsePromise = page.waitForResponse(`${ApiRoot}auth/login`);
		await dialog
			.locator('button')
			.filter({ hasText: /^LOG IN$/ })
			.click();
		const response = await responsePromise;

		await page.waitForURL(/\/home$/);
		await page.getByRole('button', { name: 'Open user menu' }).click();
		await page.getByRole('link', { name: 'Analytics' }).first().click();
		await page.waitForTimeout(3000);
	});

	test('TC-14, View with data', async ({ page }) => {
		await page.getByRole('button', { name: 'Get your Report' }).click();
		//loading...
		await expect(page.getByText('Fetch Process Compute Ready')).toBeVisible();
		await page.waitForTimeout(17000); //wait for render should be in 20 Seconds

		await expect(page.getByRole('heading', { name: 'Monthly Report', exact: true })).toBeVisible();
		await expect(page.getByText('Total Income')).toBeVisible();
		await expect(page.getByText('Total Expense')).toBeVisible();
	});
	test('TC-15, Export PDF', async ({ page }) => {
		await page.getByRole('button', { name: 'Get your Report' }).click();

		// Wait for modal to be visible
		await expect(page.getByRole('heading', { name: 'Monthly Report Preview' })).toBeVisible();

		// Wait for loading to start
		await expect(page.getByText('Fetching data from server...')).toBeVisible({ timeout: 2000 });

		// Wait for loading stages to complete
		await expect(page.getByText('Report ready!')).toBeVisible({ timeout: 25000 });

		// Verify loading indicators are gone
		await expect(page.getByText('Please wait while we prepare your report')).not.toBeVisible();

		// Verify data is loaded - check for key elements in the report
		await expect(page.getByText('Total Income')).toBeVisible();
		await expect(page.getByText('Category Breakdown')).toBeVisible();

		// Verify the download button is enabled and visible
		const downloadButton = page.getByRole('button', { name: 'Download PDF' });
		await expect(downloadButton).toBeEnabled();
		await expect(downloadButton).toBeVisible();

		// Trigger download
		const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
		await downloadButton.click();
		const download = await downloadPromise;

		// Get download details
		const suggestedFilename = download.suggestedFilename();

		console.log(`Downloaded file: ${suggestedFilename}`);

		// Assertions on the downloaded file
		expect(suggestedFilename).toMatch(/^report-.*\.pdf$/);

		// Save to test results directory and verify it saved successfully
		const savePath = `./test-results/reports/${suggestedFilename}`;
		await download.saveAs(savePath);

		console.log(`✓ PDF saved to: ${savePath}`);
	});
});
