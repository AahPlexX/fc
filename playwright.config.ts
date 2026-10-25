import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
	testDir: "./tests/e2e",
	timeout: 120_000,
	expect: { timeout: 15_000 },
	fullyParallel: false,
	workers: 1,
	retries: 0,
	reporter: "list",
	use: {
		baseURL: "http://127.0.0.1:4173",
		trace: "retain-on-failure",
		serviceWorkers: "block",
	},
	projects: [
		{ name: "chromium", use: { ...devices["Desktop Chrome"] } },
		{ name: "firefox", use: { ...devices["Desktop Firefox"] } },
		{ name: "webkit", use: { ...devices["Desktop Safari"] } },
	],
	webServer: {
		command: "pnpm exec vite preview --host 127.0.0.1 --port 4173 --strictPort",
		port: 4173,
		reuseExistingServer: !process.env.CI,
	},
});
