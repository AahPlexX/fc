import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
const csv = {
	name: "report.csv",
	mimeType: "text/csv",
	buffer: Buffer.from('name,value\r\nAda,42\r\nGrace,"hello, world"\r\n'),
};
const png = async (page: Page, width = 32, height = 24) => ({
	name: "photo-renamed.mp3",
	mimeType: "audio/mpeg",
	buffer: Buffer.from(
		await page.evaluate(
			({ width, height }) => {
				const c = document.createElement("canvas");
				c.width = width;
				c.height = height;
				const ctx = c.getContext("2d");
				if (!ctx) throw Error("canvas");
				ctx.fillStyle = "#38bdf8";
				ctx.fillRect(0, 0, width, height);
				return c.toDataURL().split(",")[1] ?? "";
			},
			{ width, height },
		),
		"base64",
	),
});
const wav = () => {
	const d = Buffer.alloc(16044);
	d.write("RIFF");
	d.writeUInt32LE(d.length - 8, 4);
	d.write("WAVEfmt ", 8);
	d.writeUInt32LE(16, 16);
	d.writeUInt16LE(1, 20);
	d.writeUInt16LE(1, 22);
	d.writeUInt32LE(8000, 24);
	d.writeUInt32LE(16000, 28);
	d.writeUInt16LE(2, 32);
	d.writeUInt16LE(16, 34);
	d.write("data", 36);
	d.writeUInt32LE(16000, 40);
	return { name: "silence.wav", mimeType: "audio/wav", buffer: d };
};
const output = async (page: Page, action: () => Promise<unknown>) => {
	const waiting = page.waitForEvent("download");
	await action();
	const file = await waiting;
	const path = await file.path();
	if (!path) throw Error("download missing");
	return { name: file.suggestedFilename(), bytes: await readFile(path) };
};
test.beforeEach(async ({ page }) => {
	await page.goto("/");
});
test("real image and table workers export valid outputs and ZIP without egress", async ({
	page,
}) => {
	const invalid: string[] = [];
	page.on("request", (r) => {
		if (
			r.method() !== "GET" ||
			new URL(r.url()).origin !== "http://127.0.0.1:4173"
		)
			invalid.push(r.url());
	});
	await page.locator("input[type=file]").setInputFiles([await png(page), csv]);
	const cards = page.locator(".job-card");
	await expect(cards).toHaveCount(2);
	await expect(cards.nth(0).getByText("PNG ·", { exact: false })).toBeVisible();
	expect(
		await cards
			.nth(0)
			.getByLabel("Target format")
			.locator("option")
			.allTextContents(),
	).not.toContain("MP3");
	await cards.nth(0).getByLabel("Target format").selectOption("webp");
	await cards.nth(1).getByLabel("Target format").selectOption("json");
	await page.getByRole("button", { name: "Convert all" }).click();
	await expect(page.locator(".job-card[data-status=completed]")).toHaveCount(2);
	const image = await output(page, () =>
		cards.nth(0).getByRole("button", { name: "Download", exact: true }).click(),
	);
	expect(image.bytes.toString("ascii", 0, 4)).toBe("RIFF");
	expect(image.bytes.toString("ascii", 8, 12)).toBe("WEBP");
	const table = await output(page, () =>
		cards.nth(1).getByRole("button", { name: "Download", exact: true }).click(),
	);
	expect(JSON.parse(table.bytes.toString())).toEqual([
		{ name: "Ada", value: "42" },
		{ name: "Grace", value: "hello, world" },
	]);
	const zip = await output(page, () =>
		page.getByRole("button", { name: "Export completed as ZIP" }).click(),
	);
	expect(Object.keys((await JSZip.loadAsync(zip.bytes)).files)).toHaveLength(2);
	expect(invalid).toEqual([]);
});
test("PDF metadata strip and edit survive reinspection", async ({ page }) => {
	const pdf = await PDFDocument.create();
	pdf.addPage();
	pdf.setAuthor("Secret author");
	pdf.setTitle("Secret title");
	await page.locator("input[type=file]").setInputFiles({
		name: "private.pdf",
		mimeType: "application/pdf",
		buffer: Buffer.from(await pdf.save()),
	});
	const card = page.locator(".job-card");
	await card.getByLabel("Target format").selectOption("pdf");
	await card.getByRole("button", { name: /Metadata/ }).click();
	const drawer = page.getByRole("dialog", { name: "Metadata" });
	await expect(
		drawer.getByText("Secret author", { exact: true }),
	).toBeVisible();
	await drawer.getByLabel("Strip all metadata", { exact: true }).check();
	await drawer.getByLabel("Title", { exact: true }).fill("Public title");
	await drawer.getByRole("button", { name: "Apply metadata" }).click();
	await card.getByRole("button", { name: "Convert", exact: true }).click();
	await expect(card).toHaveAttribute("data-status", "completed");
	const file = await output(page, () =>
		card.getByRole("button", { name: "Download", exact: true }).click(),
	);
	const result = await PDFDocument.load(file.bytes, { updateMetadata: false });
	expect(result.getTitle()).toBe("Public title");
	expect(result.getAuthor()).toBeUndefined();
	expect(result.getCreationDate()).toBeUndefined();
});
test("self-hosted FFmpeg converts WAV to MP3", async ({ page }) => {
	await page.locator("input[type=file]").setInputFiles(wav());
	const card = page.locator(".job-card");
	await card.getByLabel("Target format").selectOption("mp3");
	await card.getByRole("button", { name: "Convert", exact: true }).click();
	await expect(card).toHaveAttribute("data-status", "completed", {
		timeout: 90000,
	});
	const file = await output(page, () =>
		card.getByRole("button", { name: "Download", exact: true }).click(),
	);
	expect(file.name).toBe("silence-converted.mp3");
	expect(file.bytes.length).toBeGreaterThan(100);
	expect(
		file.bytes.toString("ascii", 0, 3) === "ID3" || file.bytes[0] === 255,
	).toBe(true);
});
test("cancels initialization then converts another file", async ({ page }) => {
	let release: () => void = () => undefined;
	const held = new Promise<void>((r) => {
		release = r;
	});
	await page.route("**/engines/ffmpeg-core.wasm", async (route) => {
		await held;
		await route.continue().catch(() => undefined);
	});
	await page.locator("input[type=file]").setInputFiles([wav(), csv]);
	const card = page.locator(".job-card").first();
	await card.getByLabel("Target format").selectOption("mp3");
	await card.getByRole("button", { name: "Convert", exact: true }).click();
	await expect(
		card.getByText("Loading Conversion Engine", { exact: true }),
	).toBeVisible();
	await card.getByRole("button", { name: "Cancel", exact: true }).click();
	release();
	await expect(card).toHaveAttribute("data-status", "cancelled");
	const table = page.locator(".job-card").nth(1);
	await table.getByLabel("Target format").selectOption("json");
	await table.getByRole("button", { name: "Convert", exact: true }).click();
	await expect(table).toHaveAttribute("data-status", "completed");
});
test("ZIP import and corrupt input isolation", async ({ page }) => {
	const zip = new JSZip();
	zip.file("one.csv", csv.buffer);
	zip.file("two.csv", csv.buffer);
	await page.locator("input[type=file]").setInputFiles({
		name: "tables.zip",
		mimeType: "application/zip",
		buffer: await zip.generateAsync({ type: "nodebuffer" }),
	});
	await expect(page.locator(".job-card")).toHaveCount(2);
	await page.locator("input[type=file]").setInputFiles({
		name: "broken.png",
		mimeType: "image/png",
		buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]),
	});
	await expect(page.locator(".job-card")).toHaveCount(3);
	const broken = page.locator(".job-card").last();
	await broken.getByRole("button", { name: "Convert", exact: true }).click();
	await expect(broken).toHaveAttribute("data-status", "failed");
});
test("PDF rasterization and image compilation produce valid files", async ({
	page,
}) => {
	const pdf = await PDFDocument.create();
	pdf.addPage([100, 120]);
	await page.locator("input[type=file]").setInputFiles({
		name: "page.pdf",
		mimeType: "application/pdf",
		buffer: Buffer.from(await pdf.save()),
	});
	const card = page.locator(".job-card");
	await card.getByLabel("Target format").selectOption("png");
	await card.getByRole("button", { name: "Convert", exact: true }).click();
	await expect(card).toHaveAttribute("data-status", "completed");
	const file = await output(page, () =>
		card.getByRole("button", { name: "Download", exact: true }).click(),
	);
	expect([...file.bytes.subarray(0, 4)]).toEqual([137, 80, 78, 71]);
	await page
		.locator("input[type=file]")
		.setInputFiles([
			await png(page),
			{ ...(await png(page)), name: "second.png" },
		]);
	await expect(page.locator(".job-card")).toHaveCount(3);
	const merged = await output(page, () =>
		page.getByRole("button", { name: "Compile / merge PDF" }).click(),
	);
	expect((await PDFDocument.load(merged.bytes)).getPageCount()).toBe(2);
});

test("JPEG privacy strips GPS and writes only explicit copyright", async ({
	page,
}) => {
	const piexif = (await import("piexifjs")).default;
	const source = await page.evaluate(() => {
		const c = document.createElement("canvas");
		c.width = 8;
		c.height = 8;
		return c.toDataURL("image/jpeg");
	});
	const tags = {
		"0th": { [piexif.ImageIFD.Artist]: "Private photographer" },
		GPS: {
			[piexif.GPSIFD.GPSLatitudeRef]: "N",
			[piexif.GPSIFD.GPSLatitude]: [
				[51, 1],
				[30, 1],
				[0, 1],
			],
		},
	};
	const data = piexif.insert(piexif.dump(tags), source);
	await page.locator("input[type=file]").setInputFiles({
		name: "gps.jpg",
		mimeType: "image/jpeg",
		buffer: Buffer.from(data.split(",")[1] ?? "", "base64"),
	});
	const card = page.locator(".job-card");
	await card.getByLabel("Target format").selectOption("jpeg");
	await card.getByRole("button", { name: /Metadata/ }).click();
	const drawer = page.getByRole("dialog", { name: "Metadata" });
	await drawer.getByLabel("Strip all metadata", { exact: true }).check();
	await drawer
		.getByLabel("Copyright", { exact: true })
		.fill("Public copyright");
	await drawer.getByRole("button", { name: "Apply metadata" }).click();
	await card.getByRole("button", { name: "Convert", exact: true }).click();
	await expect(card).toHaveAttribute("data-status", "completed");
	const result = await output(page, () =>
		card.getByRole("button", { name: "Download", exact: true }).click(),
	);
	const exif = piexif.load(
		`data:image/jpeg;base64,${result.bytes.toString("base64")}`,
	);
	expect(Object.keys(exif.GPS ?? {})).toHaveLength(0);
	expect(exif["0th"]?.[piexif.ImageIFD.Artist]).toBeUndefined();
	expect(exif["0th"]?.[piexif.ImageIFD.Copyright]).toBe("Public copyright");
});

test("BMP, ICO, SVG and Markdown routes export their declared formats", async ({
	page,
}) => {
	let count = 0;
	for (const target of ["bmp", "ico"]) {
		await page.locator("input[type=file]").setInputFiles(await png(page));
		await expect(page.locator(".job-card")).toHaveCount(++count);
		const card = page.locator(".job-card").last();
		await card.getByLabel("Target format").selectOption(target);
		await card.getByRole("button", { name: "Convert", exact: true }).click();
		await expect(card).toHaveAttribute("data-status", "completed");
		const result = await output(page, () =>
			card.getByRole("button", { name: "Download", exact: true }).click(),
		);
		if (target === "bmp")
			expect(result.bytes.toString("ascii", 0, 2)).toBe("BM");
		else expect([...result.bytes.subarray(0, 4)]).toEqual([0, 0, 1, 0]);
	}
	await page.locator("input[type=file]").setInputFiles({
		name: "graphic.svg",
		mimeType: "image/svg+xml",
		buffer: Buffer.from(
			'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10"><rect width="20" height="10" fill="red"/></svg>',
		),
	});
	await expect(page.locator(".job-card")).toHaveCount(3);
	const vector = page.locator(".job-card").last();
	await vector.getByLabel("Target format").selectOption("png");
	await vector.getByRole("button", { name: "Convert", exact: true }).click();
	await expect(vector).toHaveAttribute("data-status", "completed");
	await page.locator("input[type=file]").setInputFiles({
		name: "table.md",
		mimeType: "text/markdown",
		buffer: Buffer.from("| name | value |\n| --- | --- |\n| Ada | 42 |"),
	});
	await expect(page.locator(".job-card")).toHaveCount(4);
	const table = page.locator(".job-card").last();
	await table.getByLabel("Target format").selectOption("json");
	await table.getByRole("button", { name: "Convert", exact: true }).click();
	await expect(table).toHaveAttribute("data-status", "completed");
	const result = await output(page, () =>
		table.getByRole("button", { name: "Download", exact: true }).click(),
	);
	expect(JSON.parse(result.bytes.toString())).toEqual([
		{ name: "Ada", value: "42" },
	]);
});

test("ambiguous video container is stream-probed before audio extraction", async ({
	page,
}) => {
	const fixture = await page.evaluate(async () => {
		const url = "/engines/ffmpeg/index.js";
		const { FFmpeg } = await import(/* @vite-ignore */ url);
		const engine = new FFmpeg();
		try {
			await engine.load({
				coreURL: "/engines/ffmpeg-core.js",
				wasmURL: "/engines/ffmpeg-core.wasm",
				classWorkerURL: "/engines/ffmpeg/worker.js",
			});
			const code = await engine.exec([
				"-f",
				"lavfi",
				"-i",
				"color=c=blue:s=64x64:d=0.2",
				"-f",
				"lavfi",
				"-i",
				"anullsrc=r=8000:cl=mono",
				"-t",
				"0.2",
				"-c:v",
				"libx264",
				"-pix_fmt",
				"yuv420p",
				"-c:a",
				"aac",
				"clip.mp4",
			]);
			if (code !== 0) throw Error("fixture encoder failed");
			return Array.from(await engine.readFile("clip.mp4")) as number[];
		} finally {
			engine.terminate();
		}
	});
	await page.locator("input[type=file]").setInputFiles({
		name: "video-disguised.txt",
		mimeType: "text/plain",
		buffer: Buffer.from(fixture),
	});
	const card = page.locator(".job-card");
	await expect(card.locator(".job-domain")).toHaveText("video");
	expect(
		await card.getByLabel("Target format").locator("option").allTextContents(),
	).not.toContain("PNG");
	await card.getByLabel("Target format").selectOption("wav");
	await card.getByRole("button", { name: "Convert", exact: true }).click();
	await expect(card).toHaveAttribute("data-status", "completed");
	const result = await output(page, () =>
		card.getByRole("button", { name: "Download", exact: true }).click(),
	);
	expect(result.bytes.toString("ascii", 0, 4)).toBe("RIFF");
});

test("image dimensions are applied before export", async ({ page }) => {
	await page
		.locator("input[type=file]")
		.setInputFiles(await png(page, 1024, 512));
	const card = page.locator(".job-card");
	await card.getByLabel("Target format").selectOption("png");
	await card.getByLabel("Maximum width").selectOption("256");
	await card.getByRole("button", { name: "Convert", exact: true }).click();
	await expect(card).toHaveAttribute("data-status", "completed");
	const result = await output(page, () =>
		card.getByRole("button", { name: "Download", exact: true }).click(),
	);
	expect(result.bytes.readUInt32BE(16)).toBe(256);
	expect(result.bytes.readUInt32BE(20)).toBe(128);
});

test("archive export can be cancelled without discarding converted files", async ({
	page,
}) => {
	await page
		.locator("input[type=file]")
		.setInputFiles({
			name: "archive.csv",
			mimeType: "text/csv",
			buffer: Buffer.from("name,value\nAda,42"),
		});
	const card = page.locator(".job-card");
	await card.getByLabel("Target format").selectOption("json");
	await card.getByRole("button", { name: "Convert", exact: true }).click();
	await expect(card).toHaveAttribute("data-status", "completed");
	let release: () => void = () => undefined;
	const held = new Promise<void>((resolve) => {
		release = resolve;
	});
	await page.route("**/assets/exportFiles-*.js", async (route) => {
		await held;
		await route.continue().catch(() => undefined);
	});
	try {
		await page.getByRole("button", { name: "Export completed as ZIP" }).click();
		await expect(
			page.getByRole("button", { name: "Export completed as ZIP" }),
		).toBeDisabled({ timeout: 2000 });
		await page.getByRole("button", { name: "Cancel active operation" }).click();
		await expect(
			page.getByRole("status").filter({ hasText: "ZIP export cancelled." }),
		).toBeVisible();
		release();
		await expect(card).toHaveAttribute("data-status", "completed");
		const result = await output(page, () =>
			card.getByRole("button", { name: "Download", exact: true }).click(),
		);
		expect(JSON.parse(result.bytes.toString())).toEqual([
			{ name: "Ada", value: "42" },
		]);
	} finally {
		release();
	}
});

test("metadata inspection has a loading state and closes without blocking conversion", async ({
	page,
}) => {
	await page.locator("input[type=file]").setInputFiles(await png(page));
	const card = page.locator(".job-card");
	await expect(card).toBeVisible();
	let release: () => void = () => undefined;
	const held = new Promise<void>((resolve) => {
		release = resolve;
	});
	await page.route("**/assets/metadata.worker-*.js", async (route) => {
		await held;
		await route.continue().catch(() => undefined);
	});
	try {
		await card.getByRole("button", { name: /Metadata/ }).click();
		const dialog = page.getByRole("dialog", { name: "Metadata" });
		await expect(dialog.getByRole("status")).toHaveText("Inspecting metadata…");
		await expect(
			dialog.getByText("No supported metadata was found."),
		).toHaveCount(0);
		await dialog.getByRole("button", { name: "Close metadata" }).click();
		await expect(dialog).toHaveCount(0);
		release();
		await card.getByRole("button", { name: "Convert", exact: true }).click();
		await expect(card).toHaveAttribute("data-status", "completed");
	} finally {
		release();
	}
});
