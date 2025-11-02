import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'npm run dev && npm run preview',
		port: 5173,
		reuseExistingServer: true
	},
	testDir: 'e2e',
	reporter: 'html',
	fullyParallel: true,
});
