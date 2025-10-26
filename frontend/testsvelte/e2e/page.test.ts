import { expect, test } from 'playwright/test';

test.describe('Homepage', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('should display the main heading and description', async ({ page }) => {
		await expect(page.getByRole('heading', { name: /Welcome to ExpenTrack/i })).toBeVisible();
		await expect(page.getByText(/The warm, easy-to-read personal finance app/i)).toBeVisible();
	});

	test('should open modal when button clicked', async ({ page }) => {
		await page.getByRole('button', { name: "Already have an account?" }).click();
		await expect(page.getByRole('dialog')).toBeVisible();
	});
});
