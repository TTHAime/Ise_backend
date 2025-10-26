import { defineConfig } from '@playwright/test';
import { Html } from 'layerchart';

export default defineConfig({
	webServer: {
		command: 'npm run dev && npm run preview',
		port: 5173,
		reuseExistingServer: true
	},
	testDir: 'e2e',
	reporter : 'html',
	fullyParallel: true,
});
