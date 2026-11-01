import { expect, test, type Page } from "@playwright/test";

const expectNoHorizontalOverflow = async (page: Page) => {
	const dimensions = await page.evaluate(() => ({
		innerWidth: window.innerWidth,
		scrollWidth: document.documentElement.scrollWidth,
	}));
	expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth);
};

const expectVisibleTargetsUsable = async (page: Page) => {
	const failures = await page.evaluate(() => {
		const selectors = [
			"button",
			"select",
			'input[type="file"]',
			'input[type="range"]',
			".toggle-control",
			"a[href]",
		].join(",");
		return Array.from(document.querySelectorAll<HTMLElement>(selectors))
			.map((element) => {
				const rect = element.getBoundingClientRect();
				return {
					label:
						element.getAttribute("aria-label") ??
						element.textContent?.trim().slice(0, 80) ??
						element.tagName,
					height: rect.height,
					width: rect.width,
					left: rect.left,
					right: rect.right,
					top: rect.top,
					bottom: rect.bottom,
				};
			})
			.filter(
				(target) =>
					target.width > 0 &&
					target.height > 0 &&
					target.bottom > 0 &&
					target.top < window.innerHeight &&
					(target.width < 24 ||
						target.height < 24 ||
						target.left < -0.5 ||
						target.right > window.innerWidth + 0.5),
			);
	});
	expect(failures).toEqual([]);
};

test("workspace reflows across compact portrait, landscape, desktop, and 4K viewports", async ({ page }) => {
	await page.goto("/");
	for (const viewport of [
		{ width: 320, height: 568 },
		{ width: 568, height: 320 },
		{ width: 375, height: 667 },
		{ width: 667, height: 375 },
		{ width: 768, height: 1024 },
		{ width: 1024, height: 768 },
		{ width: 1440, height: 900 },
		{ width: 1920, height: 1080 },
		{ width: 3840, height: 2160 },
	]) {
		await page.setViewportSize(viewport);
		await expectNoHorizontalOverflow(page);
		await expect(page.getByRole("heading", { name: "OmniConvert", exact: true })).toBeVisible();
		await expect(page.getByRole("heading", { name: "Import files", exact: true })).toBeVisible();
	}
});

test("200% text size keeps a 320px workspace, long filename, actions, and preview fully usable", async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 700 });
	await page.goto("/");
	await page.evaluate(() => {
		document.documentElement.style.fontSize = "32px";
	});
	await expectNoHorizontalOverflow(page);
	await expectVisibleTargetsUsable(page);

	const longName = `${"very-long-local-file-name-".repeat(7)}data.csv`;
	await page.locator('input[type="file"]').setInputFiles({
		name: longName,
		mimeType: "text/csv",
		buffer: Buffer.from("name,value\nAda,42"),
	});
	const card = page.locator(".job-card");
	await expect(card).toBeVisible();
	await expectNoHorizontalOverflow(page);
	await expectVisibleTargetsUsable(page);

	await card.locator("select").selectOption("json");
	await card.getByRole("button", { name: "Convert", exact: true }).click();
	await expect(card).toHaveAttribute("data-status", "completed");
	await expectNoHorizontalOverflow(page);

	await card.getByRole("button", { name: "Preview", exact: true }).click();
	const dialog = page.getByRole("dialog", { name: "Preview" });
	await expect(dialog).toBeVisible();
	const bounds = await dialog.boundingBox();
	expect(bounds).not.toBeNull();
	expect(bounds?.x ?? -1).toBeGreaterThanOrEqual(0);
	expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(320.5);
	await expectNoHorizontalOverflow(page);
	await expectVisibleTargetsUsable(page);
});

test("short landscape viewports keep metadata dialog inside the visual viewport with reachable controls", async ({ page }) => {
	await page.setViewportSize({ width: 568, height: 256 });
	await page.goto("/");
	await page.locator('input[type="file"]').setInputFiles({
		name: "compact.csv",
		mimeType: "text/csv",
		buffer: Buffer.from("name,value\nAda,42"),
	});
	const card = page.locator(".job-card");
	await expect(card).toBeVisible();
	await card.getByRole("button", { name: /Metadata/ }).click();
	const dialog = page.getByRole("dialog", { name: "Metadata" });
	await expect(dialog).toBeVisible();
	const bounds = await dialog.boundingBox();
	expect(bounds).not.toBeNull();
	expect(bounds?.x ?? -1).toBeGreaterThanOrEqual(0);
	expect(bounds?.y ?? -1).toBeGreaterThanOrEqual(0);
	expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(568.5);
	expect((bounds?.y ?? 0) + (bounds?.height ?? 0)).toBeLessThanOrEqual(256.5);
	await expectNoHorizontalOverflow(page);
	await expectVisibleTargetsUsable(page);
	await expect(dialog.getByRole("button", { name: /close/i })).toBeVisible();
});
