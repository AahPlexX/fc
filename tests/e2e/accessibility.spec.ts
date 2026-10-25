import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("responsive workspace and dialogs pass automated WCAG checks and focus returns", async ({
	page,
}, info) => {
	await page.goto("/");
	for (const width of [320, 375, 768, 1440, 1920, 3840]) {
		await page.setViewportSize({ width, height: 900 });
		expect(
			await page.evaluate(
				() => document.documentElement.scrollWidth <= window.innerWidth,
			),
		).toBe(true);
	}
	await page.setViewportSize({ width: 1440, height: 900 });
	expect(
		(
			await new AxeBuilder({ page })
				.withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
				.analyze()
		).violations,
	).toEqual([]);
	await page
		.locator("input[type=file]")
		.setInputFiles({
			name: "data.csv",
			mimeType: "text/csv",
			buffer: Buffer.from("name,value\nAda,42"),
		});
	const card = page.locator(".job-card");
	await expect(card).toBeVisible();
	await page.screenshot({
		path: `test-results/workspace-${info.project.name}.png`,
		fullPage: true,
	});
	const opener = card.getByRole("button", { name: /Metadata/ });
	await opener.click();
	const dialog = page.getByRole("dialog", { name: "Metadata" });
	await expect(dialog).toBeVisible();
	expect(
		(
			await new AxeBuilder({ page })
				.withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
				.analyze()
		).violations,
	).toEqual([]);
	for (let i = 0; i < 12; i++) {
		await page.keyboard.press("Tab");
		expect(
			await dialog.evaluate((d) => d.contains(document.activeElement)),
		).toBe(true);
	}
	await page.keyboard.press("Escape");
	await expect(dialog).toHaveCount(0);
	await expect(opener).toBeFocused();
	await card.locator("select").selectOption("json");
	await card.getByRole("button", { name: "Convert", exact: true }).click();
	await expect(card).toHaveAttribute("data-status", "completed");
	await card.getByRole("button", { name: "Preview", exact: true }).click();
	await expect(page.getByRole("dialog", { name: "Preview" })).toBeVisible();
	expect(
		(
			await new AxeBuilder({ page })
				.withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
				.analyze()
		).violations,
	).toEqual([]);
	await page.keyboard.press("Escape");
	await expect(
		card.getByRole("button", { name: "Preview", exact: true }),
	).toBeFocused();
	await page.setViewportSize({ width: 320, height: 700 });
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= window.innerWidth,
		),
	).toBe(true);
	await page.screenshot({
		path: `test-results/mobile-${info.project.name}.png`,
		fullPage: true,
	});
});

test("production shell and a warmed table engine work offline without caching user files", async ({
	browser,
}) => {
	const context = await browser.newContext({ serviceWorkers: "allow" });
	const page = await context.newPage();
	await page.goto("/");
	await page.evaluate(async () => {
		await navigator.serviceWorker.ready;
	});
	await page.reload();
	await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
	await page
		.locator("input[type=file]")
		.setInputFiles({
			name: "online.csv",
			mimeType: "text/csv",
			buffer: Buffer.from("name,value\nAda,42"),
		});
	await page.locator(".job-card").locator("select").selectOption("json");
	await page
		.locator(".job-card")
		.getByRole("button", { name: "Convert", exact: true })
		.click();
	await expect(page.locator(".job-card")).toHaveAttribute(
		"data-status",
		"completed",
	);
	await page.waitForFunction(async () => {
		for (const key of await caches.keys()) {
			const cache = await caches.open(key);
			if ((await cache.keys()).some((r) => r.url.includes("tabular.worker")))
				return true;
		}
		return false;
	});
	await context.setOffline(true);
	await page.reload();
	await expect(
		page.getByRole("heading", { name: "OmniConvert", exact: true }),
	).toBeVisible();
	await page
		.locator("input[type=file]")
		.setInputFiles({
			name: "offline.csv",
			mimeType: "text/csv",
			buffer: Buffer.from("name,value\nOffline,7"),
		});
	await page.locator(".job-card").locator("select").selectOption("json");
	await page
		.locator(".job-card")
		.getByRole("button", { name: "Convert", exact: true })
		.click();
	await expect(page.locator(".job-card")).toHaveAttribute(
		"data-status",
		"completed",
	);
	const cacheUrls = await page.evaluate(async () => {
		const urls = [];
		for (const key of await caches.keys()) {
			for (const r of await (await caches.open(key)).keys()) urls.push(r.url);
		}
		return urls;
	});
	expect(
		cacheUrls.every(
			(u) =>
				!u.includes("online.csv") &&
				!u.includes("offline.csv") &&
				!u.startsWith("blob:"),
		),
	).toBe(true);
	await context.close();
});
