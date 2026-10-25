import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createPdfFixture } from "../fixtures/pdf";

const tabUntilFocused = async (
	page: import("@playwright/test").Page,
	locator: import("@playwright/test").Locator,
	limit = 48,
) => {
	for (let index = 0; index < limit; index++) {
		if (await locator.evaluate((element) => element === document.activeElement))
			return;
		await page.keyboard.press("Tab");
	}
	throw new Error("Keyboard focus did not reach the expected control");
};

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
	await page.locator("input[type=file]").setInputFiles({
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
	await page.locator("input[type=file]").setInputFiles({
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
	await page.locator("input[type=file]").setInputFiles({
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

test("keyboard-only import, target selection, conversion, preview and download", async ({
	page,
}) => {
	await page.goto("/");
	const fileInput = page.getByLabel("Choose files");
	await tabUntilFocused(page, fileInput);
	const chooserPromise = page.waitForEvent("filechooser");
	await page.keyboard.press("Enter");
	const chooser = await chooserPromise;
	await chooser.setFiles({
		name: "keyboard.csv",
		mimeType: "text/csv",
		buffer: Buffer.from("name,value\nAda,42"),
	});

	const card = page.locator(".job-card");
	await expect(card).toBeVisible();
	const target = card.getByLabel("Target format");
	await tabUntilFocused(page, target);
	await page.keyboard.press("ArrowDown");
	await page.keyboard.press("ArrowDown");
	await page.keyboard.press("Enter");
	await expect(target).toHaveValue("json");

	const convert = card.getByRole("button", { name: "Convert", exact: true });
	await tabUntilFocused(page, convert);
	await page.keyboard.press("Enter");
	await expect(card).toHaveAttribute("data-status", "completed");

	const preview = card.getByRole("button", { name: "Preview", exact: true });
	await tabUntilFocused(page, preview);
	await page.keyboard.press("Enter");
	const dialog = page.getByRole("dialog", { name: "Preview" });
	await expect(dialog).toBeVisible();
	await expect(
		dialog.getByText("Plain text preview (first 50 lines)"),
	).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(preview).toBeFocused();

	const download = card.getByRole("button", { name: "Download", exact: true });
	await tabUntilFocused(page, download);
	const downloadPromise = page.waitForEvent("download");
	await page.keyboard.press("Enter");
	const result = await downloadPromise;
	expect(result.suggestedFilename()).toMatch(/\.json$/);
});

test("effective 200%/400% CSS viewports and user display preferences remain usable", async ({
	page,
}, info) => {
	await page.goto("/");
	await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
	expect(
		await page.evaluate(() => matchMedia("(forced-colors: active)").matches),
	).toBe(true);
	expect(
		await page.evaluate(
			() => matchMedia("(prefers-reduced-motion: reduce)").matches,
		),
	).toBe(true);
	expect(
		await page.evaluate(
			() => getComputedStyle(document.documentElement).scrollBehavior,
		),
	).toBe("auto");
	const forcedColorPolicy = await page
		.locator("button")
		.first()
		.evaluate((button) => ({
			supported: CSS.supports("forced-color-adjust", "auto"),
			value: getComputedStyle(button).getPropertyValue("forced-color-adjust"),
		}));
	if (forcedColorPolicy.supported) expect(forcedColorPolicy.value).toBe("auto");
	else
		info.annotations.push({
			type: "unsupported-css",
			description:
				"This engine does not expose forced-color-adjust; forced-colors media emulation and reflow are still exercised.",
		});

	for (const [width, height] of [
		[640, 450],
		[320, 225],
	] as const) {
		await page.setViewportSize({ width, height });
		expect(
			await page.evaluate(
				() => document.documentElement.scrollWidth <= window.innerWidth,
			),
		).toBe(true);
		const copy = await page
			.getByRole("heading", { name: "OmniConvert" })
			.boundingBox();
		expect(copy).not.toBeNull();
		if (!copy) throw new Error("Workbench heading has no visible box");
		expect(copy.width).toBeLessThanOrEqual(width);
	}
});

test("metadata drawer keeps keyboard focus above its sticky footer at narrow and tablet widths", async ({
	page,
}) => {
	await page.goto("/");
	const pdf = await createPdfFixture();
	await page.locator("input[type=file]").setInputFiles({
		name: "focus.pdf",
		mimeType: "application/pdf",
		buffer: Buffer.from(pdf),
	});
	const card = page.locator(".job-card");
	await expect(card).toBeVisible();

	for (const width of [320, 768]) {
		await page.setViewportSize({ width, height: 420 });
		await card.getByRole("button", { name: /^Metadata/ }).click();
		const drawer = page.getByRole("dialog", { name: "Metadata" });
		await expect(drawer).toBeVisible();
		const lastField = drawer.getByLabel("Producer", { exact: true });
		await expect(lastField).toBeVisible();
		await tabUntilFocused(page, lastField);
		const inputRect = await lastField.boundingBox();
		const footerRect = await drawer.locator("footer").boundingBox();
		expect(inputRect).not.toBeNull();
		expect(footerRect).not.toBeNull();
		if (!inputRect || !footerRect)
			throw new Error("Drawer focus geometry is unavailable");
		expect(inputRect.y + inputRect.height).toBeLessThanOrEqual(footerRect.y);
		expect(inputRect.y + inputRect.height).toBeLessThanOrEqual(420);
		await page.keyboard.press("Escape");
		await expect(drawer).toHaveCount(0);
	}
});
