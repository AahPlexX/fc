import { test, expect, type Page } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";

interface BrowserMetrics {
	support: Record<string, boolean>;
	longTasks: Array<{ startTime: number; duration: number }>;
	events: Array<{ name: string; startTime: number; duration: number }>;
	longTaskCount: number;
	eventCount: number;
	lcp: number | null;
	cls: number;
}

interface PhaseRange {
	start: number;
	end: number;
}

const MAX_OBSERVER_SAMPLES = 200;

const initializeMetrics = async (page: Page) => {
	await page.addInitScript(() => {
		const supported = PerformanceObserver.supportedEntryTypes ?? [];
		performance.mark("lab:document-start");
		const metrics: BrowserMetrics = {
			support: { lcp: false, cls: false, longtask: false, event: false },
			longTasks: [],
			events: [],
			longTaskCount: 0,
			eventCount: 0,
			lcp: null,
			cls: 0,
		};
		const save = (key: keyof BrowserMetrics, value: unknown) => {
			(window as Window & { __labMetrics?: BrowserMetrics }).__labMetrics =
				metrics;
			Object.assign(metrics, { [key]: value });
		};
		const observe = (
			type: string,
			callback: (entries: PerformanceEntry[]) => void,
			options: PerformanceObserverInit & { durationThreshold?: number } = {
				type,
				buffered: true,
			},
		) => {
			if (!supported.includes(type)) return false;
			try {
				new PerformanceObserver((list) => callback(list.getEntries())).observe(
					options,
				);
				return true;
			} catch {
				return false;
			}
		};

		metrics.support.lcp = observe("largest-contentful-paint", (entries) => {
			const last = entries.at(-1);
			if (last) metrics.lcp = last.startTime;
		});
		metrics.support.cls = observe("layout-shift", (entries) => {
			for (const entry of entries as (PerformanceEntry & {
				hadRecentInput?: boolean;
				value?: number;
			})[]) {
				if (!entry.hadRecentInput) metrics.cls += entry.value ?? 0;
			}
		});
		metrics.support.longtask = observe("longtask", (entries) => {
			metrics.longTaskCount += entries.length;
			metrics.longTasks.push(
				...entries.slice(0, 200 - metrics.longTasks.length).map((entry) => ({
					startTime: entry.startTime,
					duration: entry.duration,
				})),
			);
		});
		metrics.support.event = observe(
			"event",
			(entries) => {
				metrics.eventCount += entries.length;
				metrics.events.push(
					...entries.slice(0, 200 - metrics.events.length).map((entry) => ({
						name: entry.name,
						startTime: entry.startTime,
						duration: entry.duration,
					})),
				);
			},
			{ type: "event", buffered: true, durationThreshold: 16 },
		);
		save("support", metrics.support);
	});
};

const readMetrics = (page: Page) =>
	page.evaluate(() => {
		const metrics = (window as Window & { __labMetrics?: BrowserMetrics })
			.__labMetrics;
		const navigation = performance.getEntriesByType("navigation")[0] as
			| PerformanceNavigationTiming
			| undefined;
		const paints = performance.getEntriesByType("paint");
		return {
			support: metrics?.support ?? {},
			lcp: metrics?.lcp ?? null,
			cls: metrics?.cls ?? null,
			longTasks: metrics?.longTasks ?? [],
			events: metrics?.events ?? [],
			longTaskCount: metrics?.longTaskCount ?? 0,
			eventCount: metrics?.eventCount ?? 0,
			marks: Object.fromEntries(
				performance
					.getEntriesByType("mark")
					.filter((entry) => entry.name.startsWith("lab:"))
					.map((entry) => [entry.name.slice(4), entry.startTime]),
			),
			timing: {
				domContentLoaded: navigation?.domContentLoadedEventEnd ?? null,
				loadEvent: navigation?.loadEventEnd ?? null,
				firstPaint:
					paints.find((entry) => entry.name === "first-paint")?.startTime ??
					null,
				firstContentfulPaint:
					paints.find((entry) => entry.name === "first-contentful-paint")
						?.startTime ?? null,
			},
		};
	});

test("records initial shell timing and responsiveness during real worker table conversion", async ({
	page,
	browser,
}, info) => {
	let tableWorkerUrl = "";
	page.on("worker", (worker) => {
		if (worker.url().includes("/tabular.worker-"))
			tableWorkerUrl = worker.url();
	});
	const invalidRequests: Array<{
		method: string;
		origin: string;
		bodyBytes: number;
	}> = [];
	page.on("request", (request) => {
		const origin = new URL(request.url()).origin;
		const bodyBytes = request.postDataBuffer()?.length ?? 0;
		if (
			request.method() !== "GET" ||
			origin !== "http://127.0.0.1:4173" ||
			bodyBytes > 0
		)
			invalidRequests.push({ method: request.method(), origin, bodyBytes });
	});
	await initializeMetrics(page);
	await page.goto("/", { waitUntil: "networkidle" });
	await page.evaluate(
		() =>
			new Promise<void>((resolve) =>
				requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
			),
	);
	await page.waitForTimeout(500);
	await page.evaluate(() => performance.mark("lab:shell-end"));
	const shell = await readMetrics(page);
	const viewport = page.viewportSize();
	const browserInfo = {
		name: browser.browserType().name(),
		version: browser.version(),
		userAgent: await page.evaluate(() => navigator.userAgent),
		viewport,
	};

	const row = "Ada Lovelace,42,analytical engine,London\n";
	const rows = Math.ceil((3 * 1024 * 1024) / row.length);
	const csv = `name,value,note,city\n${row.repeat(rows)}`;
	expect(Buffer.byteLength(csv)).toBeGreaterThanOrEqual(2 * 1024 * 1024);
	expect(Buffer.byteLength(csv)).toBeLessThanOrEqual(5 * 1024 * 1024);
	await page.evaluate(() => performance.mark("lab:fixture-input-start"));
	await page.locator('input[type="file"]').setInputFiles({
		name: "lab-table.csv",
		mimeType: "text/csv",
		buffer: Buffer.from(csv),
	});
	const card = page.locator(".job-card");
	await expect(card).toBeVisible();
	await card.getByLabel("Target format").selectOption("json");
	await page.evaluate(() => performance.mark("lab:fixture-input-end"));
	await page.evaluate(() => {
		const target = window as Window & {
			__labHeartbeat?: number;
			__labTimer?: number;
		};
		target.__labHeartbeat = 0;
		target.__labTimer = window.setInterval(() => {
			target.__labHeartbeat = (target.__labHeartbeat ?? 0) + 1;
		}, 10);
	});
	await page.evaluate(() => performance.mark("lab:conversion-start"));
	await card.getByRole("button", { name: "Convert", exact: true }).click();
	await expect(card).toHaveAttribute("data-status", "completed", {
		timeout: 60_000,
	});
	await page.waitForTimeout(100);
	await page.evaluate(() => performance.mark("lab:conversion-end"));
	const heartbeat = await page.evaluate(() => {
		const target = window as Window & {
			__labHeartbeat?: number;
			__labTimer?: number;
		};
		window.clearInterval(target.__labTimer);
		return target.__labHeartbeat ?? 0;
	});
	const result = await (async () => {
		await page.evaluate(() => performance.mark("lab:download-start"));
		const downloadWait = page.waitForEvent("download");
		await card.getByRole("button", { name: "Download", exact: true }).click();
		const download = await downloadWait;
		const filePath = await download.path();
		if (!filePath) throw new Error("Converted JSON download was not created");
		await page.evaluate(() => performance.mark("lab:download-end"));
		return filePath;
	})();
	const convertedRows = JSON.parse(await readFile(result, "utf8")) as Array<{
		name: string;
		value: string;
		note: string;
		city: string;
	}>;
	const finalMetrics = await readMetrics(page);
	const requireMark = (marks: Record<string, number>, name: string): number => {
		const value = marks[name];
		if (typeof value !== "number")
			throw new Error(`Missing performance phase mark: ${name}`);
		return value;
	};
	const phaseRanges = {
		shell: { start: 0, end: requireMark(shell.marks, "shell-end") },
		fixtureInput: {
			start: requireMark(finalMetrics.marks, "fixture-input-start"),
			end: requireMark(finalMetrics.marks, "fixture-input-end"),
		},
		conversion: {
			start: requireMark(finalMetrics.marks, "conversion-start"),
			end: requireMark(finalMetrics.marks, "conversion-end"),
		},
		download: {
			start: requireMark(finalMetrics.marks, "download-start"),
			end: requireMark(finalMetrics.marks, "download-end"),
		},
	} satisfies Record<string, PhaseRange>;
	const phases = Object.fromEntries(
		Object.entries(phaseRanges).map(([phase, range]) => [
			phase,
			{
				range,
				support: finalMetrics.support,
				longTasks: finalMetrics.support.longtask
					? finalMetrics.longTasks.filter(
							(entry) =>
								entry.startTime < range.end &&
								entry.startTime + entry.duration > range.start,
						)
					: { status: "unsupported" },
				events: finalMetrics.support.event
					? finalMetrics.events.filter(
							(entry) =>
								entry.startTime < range.end &&
								entry.startTime + entry.duration > range.start,
						)
					: { status: "unsupported" },
			},
		]),
	);
	const conversionMs =
		phaseRanges.conversion.end - phaseRanges.conversion.start;
	const labReport = {
		browser: browserInfo,
		shell: {
			...shell,
			lcp: shell.support.lcp ? shell.lcp : { status: "unsupported" },
			cls: shell.support.cls ? shell.cls : { status: "unsupported" },
			longTasks: shell.support.longtask
				? shell.longTasks
				: { status: "unsupported" },
			events: shell.support.event ? shell.events : { status: "unsupported" },
		},
		conversion: {
			inputBytes: Buffer.byteLength(csv),
			rows: convertedRows.length,
			wallTimeMs: conversionMs,
			heartbeatTicks: heartbeat,
		},
		observerTimeline: {
			longTasks: finalMetrics.support.longtask
				? {
						observed: finalMetrics.longTaskCount,
						samples: finalMetrics.longTasks,
					}
				: { status: "unsupported" },
			events: finalMetrics.support.event
				? { observed: finalMetrics.eventCount, samples: finalMetrics.events }
				: { status: "unsupported" },
			sampleLimit: MAX_OBSERVER_SAMPLES,
		},
		phases,
		requestAudit: {
			invalidRequestCount: invalidRequests.length,
			invalidRequests,
		},
	};
	const reportPath = info.outputPath("lab-performance.json");
	await writeFile(reportPath, JSON.stringify(labReport, null, 2));
	await info.attach("lab-performance.json", {
		path: reportPath,
		contentType: "application/json",
	});
	console.info(`lab-performance ${JSON.stringify(labReport)}`);

	expect(conversionMs).toBeLessThan(60_000);
	expect(heartbeat).toBeGreaterThan(0);
	expect(convertedRows).toHaveLength(rows);
	expect(convertedRows[0]).toEqual({
		name: "Ada Lovelace",
		value: "42",
		note: "analytical engine",
		city: "London",
	});
	expect(tableWorkerUrl).not.toBe("");
	const boundary = await page.evaluate(
		(url) =>
			new Promise<{ isBlob: boolean; hasText: boolean; rows: unknown }>(
				(resolve, reject) => {
					const worker = new Worker(url, { type: "module" });
					const timer = setTimeout(() => {
						worker.terminate();
						reject(new Error("Worker boundary check timed out"));
					}, 10000);
					worker.onerror = (event) => {
						clearTimeout(timer);
						worker.terminate();
						reject(new Error(event.message));
					};
					worker.onmessage = async (event) => {
						if (event.data.type === "progress") return;
						clearTimeout(timer);
						worker.terminate();
						if (event.data.type === "error") {
							reject(new Error(event.data.message));
							return;
						}
						const isBlob = event.data.blob instanceof Blob;
						resolve({
							isBlob,
							hasText: "text" in event.data,
							rows: isBlob ? JSON.parse(await event.data.blob.text()) : null,
						});
					};
					const text = "name,value\nAda,42";
					worker.postMessage({
						type: "convert",
						jobId: "binary-boundary",
						text,
						file: new File([text], "boundary.csv"),
						source: "csv",
						target: "json",
					});
				},
			),
		tableWorkerUrl,
	);
	expect(boundary).toEqual({
		isBlob: true,
		hasText: false,
		rows: [{ name: "Ada", value: "42" }],
	});
	const unicodeBoundary = await page.evaluate(
		(url) =>
			new Promise<{ rows: number; suffix: string }>((resolve, reject) => {
				const worker = new Worker(url, { type: "module" });
				const timer = setTimeout(() => {
					worker.terminate();
					reject(new Error("Unicode stream check timed out"));
				}, 10000);
				worker.onmessage = async (event) => {
					if (event.data.type === "progress") return;
					clearTimeout(timer);
					worker.terminate();
					if (event.data.type === "error") {
						reject(new Error(event.data.message));
						return;
					}
					try {
						const rows = JSON.parse(await event.data.blob.text());
						resolve({ rows: rows.length, suffix: rows[0].value.slice(-3) });
					} catch (error) {
						reject(error);
					}
				};
				worker.onerror = (event) => {
					clearTimeout(timer);
					worker.terminate();
					reject(new Error(event.message));
				};
				const prefix = "name,value\nAda,";
				const text = `${prefix}${"a".repeat(1024 * 1024 - prefix.length - 1)}🌍Z\n`;
				worker.postMessage({
					type: "convert",
					jobId: "unicode-boundary",
					file: new File([text], "unicode.csv"),
					source: "csv",
					target: "json",
				});
			}),
		tableWorkerUrl,
	);
	expect(unicodeBoundary).toEqual({ rows: 1, suffix: "🌍Z" });
	expect(invalidRequests).toEqual([]);
});
