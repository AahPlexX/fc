import {
	test,
	expect,
	type BrowserType,
	type LaunchOptions,
} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createServer } from "node:http";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join, resolve as resolvePath, sep } from "node:path";

const createServiceWorkerSession = async (
	browserType: BrowserType,
	options: LaunchOptions,
) => {
	const profile = await mkdtemp(join(tmpdir(), "omniconvert-sw-"));
	try {
		const context = await browserType.launchPersistentContext(profile, {
			...options,
			serviceWorkers: "allow",
		});
		return {
			context,
			close: async () => {
				try {
					await context.close();
				} finally {
					await rm(profile, { recursive: true, force: true });
				}
			},
		};
	} catch (error) {
		await rm(profile, { recursive: true, force: true });
		throw error;
	}
};

const startProductionHarness = async (
	transformWorker: (source: string) => string = (source) => source,
) => {
	const distRoot = resolvePath(process.cwd(), "dist");
	const headerFile = await readFile(`${distRoot}/_headers`, "utf8");
	const csp = headerFile.match(/^\s*Content-Security-Policy:\s*(.+)$/m)?.[1];
	if (!csp) throw new Error("Built static headers do not include a CSP");
	const contentTypes: Record<string, string> = {
		".css": "text/css; charset=utf-8",
		".html": "text/html; charset=utf-8",
		".js": "text/javascript; charset=utf-8",
		".mjs": "text/javascript; charset=utf-8",
		".svg": "image/svg+xml",
		".wasm": "application/wasm",
		".webmanifest": "application/manifest+json",
		".txt": "text/plain; charset=utf-8",
	};
	let quotaWriteAttempts = 0;
	let claimRequests = 0;
	const updateClaimStates: string[] = [];
	const server = createServer(async (request, response) => {
		try {
			const url = new URL(request.url ?? "/", "http://127.0.0.1");
			const pathname = decodeURIComponent(url.pathname);
			if (pathname === "/__update-claim") {
				updateClaimStates.push(url.searchParams.get("state") ?? "missing");
				response.writeHead(204).end();
				return;
			}
			if (pathname === "/__claim-requested" && request.method === "POST") {
				claimRequests += 1;
				response.writeHead(204).end();
				return;
			}
			if (pathname === "/__quota-write-attempt" && request.method === "POST") {
				quotaWriteAttempts += 1;
				response.writeHead(204).end();
				return;
			}
			let body: Buffer;
			let filePath: string | null = null;
			if (pathname === "/engines/quota-probe.wasm") {
				body = Buffer.from("small same-origin wasm probe");
			} else {
				const relativePath =
					pathname === "/" ? "index.html" : pathname.slice(1);
				filePath = resolvePath(distRoot, relativePath);
				if (!filePath.startsWith(`${distRoot}${sep}`)) {
					response.writeHead(403).end();
					return;
				}
				body = await readFile(filePath);
				if (pathname === "/sw.js")
					body = Buffer.from(transformWorker(body.toString()));
			}
			response.setHeader("Content-Security-Policy", csp);
			response.setHeader("X-Content-Type-Options", "nosniff");
			response.setHeader("Referrer-Policy", "no-referrer");
			response.setHeader(
				"Permissions-Policy",
				"camera=(), microphone=(), geolocation=()",
			);
			response.setHeader(
				"Content-Type",
				pathname === "/engines/quota-probe.wasm"
					? "application/wasm"
					: (contentTypes[
							extname(pathname === "/" ? "/index.html" : pathname)
						] ?? "application/octet-stream"),
			);
			response.setHeader(
				"Cache-Control",
				pathname.startsWith("/assets/")
					? "public, max-age=31536000, immutable"
					: "no-cache",
			);
			response.setHeader("Content-Length", body.length);
			response.writeHead(200);
			response.end(request.method === "HEAD" ? undefined : body);
		} catch {
			response.writeHead(404).end();
		}
	});
	await new Promise<void>((resolve, reject) => {
		server.once("error", reject);
		server.listen(0, "127.0.0.1", resolve);
	});
	const address = server.address();
	if (!address || typeof address === "string")
		throw new Error("Test server did not bind a port");
	return {
		origin: `http://127.0.0.1:${address.port}`,
		get updateClaimStates() {
			return updateClaimStates;
		},
		get claimRequests() {
			return claimRequests;
		},
		get quotaWriteAttempts() {
			return quotaWriteAttempts;
		},
		close: () =>
			new Promise<void>((resolve, reject) =>
				server.close((error) => (error ? reject(error) : resolve())),
			),
	};
};
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
	playwright,
	browserName,
	launchOptions,
	headless,
}) => {
	const session = await createServiceWorkerSession(playwright[browserName], {
		...launchOptions,
		headless,
	});
	const { context } = session;
	try {
		const page = await context.newPage();
		await page.goto("/");
		await page.evaluate(async () => {
			await navigator.serviceWorker.ready;
		});
		await page.reload();
		await page.waitForFunction(
			() => navigator.serviceWorker.controller !== null,
		);
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
	} finally {
		await session.close();
	}
});

test("preview serves production security headers and the correct WASM MIME type", async ({
	page,
}) => {
	const documentResponse = await page.goto("/");
	expect(documentResponse?.status()).toBe(200);
	const html = await documentResponse?.text();
	const entryPath = html?.match(/src="([^"]+\.js)"/)?.[1];
	expect(entryPath).toBeTruthy();
	const [wasmResponse, workerResponse, entryResponse] = await Promise.all([
		page.request.head("/engines/core/0.12.10/ffmpeg-core.wasm"),
		page.request.head("/sw.js"),
		page.request.head(entryPath ?? "/"),
	]);
	expect(wasmResponse.status()).toBe(200);
	expect(wasmResponse.headers()["content-type"]).toBe("application/wasm");
	expect(workerResponse.status()).toBe(200);
	expect(workerResponse.headers()["content-type"]).toContain("javascript");
	for (const response of [documentResponse, wasmResponse, workerResponse])
		expect(response?.headers()["cache-control"]).toContain("no-cache");
	expect(workerResponse.headers()["cache-control"]).toContain("no-cache");
	expect(entryResponse.headers()["cache-control"]).toContain("immutable");

	for (const response of [documentResponse, wasmResponse, workerResponse]) {
		if (!response) throw new Error("Document response missing");
		const headers = response.headers();
		expect(headers["x-content-type-options"]).toBe("nosniff");
		expect(headers["referrer-policy"]).toBe("no-referrer");
		expect(headers["permissions-policy"]).toContain("camera=()");
		expect(headers["permissions-policy"]).toContain("microphone=()");
		expect(headers["permissions-policy"]).toContain("geolocation=()");
		expect(headers["content-security-policy"]).toContain("form-action 'none'");
		expect(headers["content-security-policy"]).toContain("base-uri 'none'");
	}
	const staticRules = await page.request.get("/_headers");
	expect(staticRules.status()).toBe(200);
	const rules = await staticRules.text();
	expect(rules).toContain("/engines/*\n  Cache-Control: no-cache");
	expect(rules).toContain(
		"/assets/*\n  Cache-Control: public, max-age=31536000, immutable",
	);
});

test("a CacheStorage quota error does not fail a successful same-origin asset load", async ({
	playwright,
	browserName,
	launchOptions,
	headless,
}, info) => {
	let workerServed = false;
	let cacheOpenCallCount = 0;
	const server = await startProductionHarness((source) => {
		workerServed = true;
		const matches = source.match(/caches\.open\(CACHE_NAME\)/g) ?? [];
		cacheOpenCallCount = matches.length;
		if (cacheOpenCallCount === 0)
			throw new Error("Built worker has no cache open to instrument");
		const instrumentedWorker = source.replaceAll(
			"caches.open(CACHE_NAME)",
			"__testCacheOpen(CACHE_NAME)",
		);
		const prelude = `
const __nativeCacheOpen = caches.open.bind(caches);
const __testCacheOpen = async (name) => {
  const nativeCache = await __nativeCacheOpen(name);
  return new Proxy(nativeCache, {
    get(target, property) {
      if (property === "put") return (request, response) => {
        const url = typeof request === "string" ? request : request.url;
        if (new URL(url, self.location.href).pathname === "/engines/quota-probe.wasm") {
          return fetch("/__quota-write-attempt", { method: "POST" }).then(() => {
            throw new DOMException("Storage is full", "QuotaExceededError");
          });
        }
        return target.put(request, response);
      };
      const value = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    }
  });
};
`;
		return prelude + instrumentedWorker;
	});
	const session = await createServiceWorkerSession(playwright[browserName], {
		...launchOptions,
		headless,
	});
	const { context } = session;
	try {
		const page = await context.newPage();
		await page.goto(server.origin);
		await page.waitForFunction(async () => {
			const registration = await navigator.serviceWorker.getRegistration("/");
			return (
				registration?.active?.state === "activated" &&
				Boolean(navigator.serviceWorker.controller)
			);
		});
		// Probe an already-controlled navigation rather than a document whose
		// first client-claim notification may still be propagating.
		await page.goto(`${server.origin}/?controlled=1`);
		await page.waitForFunction(
			() => navigator.serviceWorker.controller?.state === "activated",
		);
		expect(workerServed).toBe(true);
		expect(cacheOpenCallCount).toBeGreaterThan(0);
		const result = await page.evaluate(async () => {
			let fetchResult:
				| { status: number; type: string; body: string }
				| { error: string };
			try {
				const response = await fetch("/engines/quota-probe.wasm");
				fetchResult = {
					status: response.status,
					type: response.type,
					body: await response.text(),
				};
			} catch (error) {
				fetchResult = {
					error: error instanceof Error ? error.name : String(error),
				};
			}
			return { fetchResult };
		});
		const quotaResult = {
			browser: browserName,
			status:
				server.quotaWriteAttempts > 0
					? "injected-cache-write-rejection-observed"
					: "unsupported-no-cache-write-observed",
			reason:
				server.quotaWriteAttempts > 0
					? null
					: "This browser did not invoke Cache.put for the controlled same-origin WASM request.",
			workerServed,
			cacheOpenCallCount,
			quotaWriteAttempts: server.quotaWriteAttempts,
			fetchResult: result.fetchResult,
		};
		const quotaPath = info.outputPath("cache-quota-probe.json");
		await writeFile(quotaPath, JSON.stringify(quotaResult, null, 2));
		await info.attach("cache-quota-probe.json", {
			path: quotaPath,
			contentType: "application/json",
		});
		expect(server.quotaWriteAttempts).toBeGreaterThan(0);
		expect(result.fetchResult).toEqual({
			status: 200,
			type: "basic",
			body: "small same-origin wasm probe",
		});
		const cached = await page.evaluate(async () => {
			for (const name of await caches.keys()) {
				if (await (await caches.open(name)).match("/engines/quota-probe.wasm"))
					return true;
			}
			return false;
		});
		expect(cached).toBe(false);
	} finally {
		try {
			await session.close();
		} finally {
			await server.close();
		}
	}
});

test("a pending client claim cannot block service-worker activation", async ({
	playwright,
	browserName,
	launchOptions,
	headless,
}) => {
	const server = await startProductionHarness((source) => {
		if (!source.includes("self.clients.claim()"))
			throw new Error("Client claim hook missing");
		const body = source.replaceAll("self.clients.claim()", "__testClaim()");
		// Hold the optional API promise until activation is observable. This
		// models a claim operation pending on a client being created/navigated.
		return `
const __nativeClaim = self.clients.claim.bind(self.clients);
let __resolveClaim;
let __rejectClaim;
const __testClaim = () => new Promise((resolve, reject) => {
  void fetch("/__claim-requested", { method:"POST" });
  __resolveClaim = resolve;
  __rejectClaim = reject;
});
self.addEventListener("message", event => {
  if (event.data !== "release-test-claim") return;
  event.waitUntil(__nativeClaim().then(__resolveClaim, __rejectClaim));
});
${body}`;
	});
	const session = await createServiceWorkerSession(playwright[browserName], {
		...launchOptions,
		headless,
	});
	const { context } = session;
	try {
		const page = await context.newPage();
		await page.goto(server.origin);
		await expect
			.poll(
				() =>
					page.evaluate(async () => {
						const registration =
							await navigator.serviceWorker.getRegistration("/");
						return registration?.active?.state;
					}),
				{ timeout: 5_000 },
			)
			.toBe("activated");
		await expect.poll(() => server.claimRequests).toBeGreaterThan(0);
		await page.evaluate(async () => {
			const registration = await navigator.serviceWorker.getRegistration("/");
			registration?.active?.postMessage("release-test-claim");
		});
		await page.waitForFunction(() =>
			Boolean(navigator.serviceWorker.controller),
		);
		await expect(
			page.getByRole("heading", { name: "OmniConvert", exact: true }),
		).toBeVisible();
	} finally {
		try {
			await session.close();
		} finally {
			await server.close();
		}
	}
});

test("a new service worker waits for old clients before deleting their cache", async ({
	playwright,
	browserName,
	launchOptions,
	headless,
}) => {
	let revision = "v1";
	const servedVersions: string[] = [];
	const server = await startProductionHarness((source) => {
		if (!/const CACHE_NAME = "omniconvert-shell-[^"]+";/.test(source))
			throw new Error(
				"Expected the built service worker with an injected cache version",
			);
		servedVersions.push(revision);
		// Keep v2 activating while a replacement page opens. WebKit can retain
		// an outdated page-side worker.state during this overlap; observe state
		// at the actual native claim boundary instead of trusting that snapshot.
		const instrumented =
			revision === "v2"
				? `
const __nativeUpdateClaim = self.clients.claim.bind(self.clients);
const __testUpdateClaim = () => {
  void fetch("/__update-claim?state=" + self.registration.active?.state);
  return __nativeUpdateClaim();
};
self.addEventListener("activate", event => {
  event.waitUntil(new Promise(resolve => setTimeout(resolve, 500)));
});
${source.replaceAll("self.clients.claim()", "__testUpdateClaim()")}`
				: source;
		return instrumented.replace(
			/const CACHE_NAME = "omniconvert-shell-[^"]+";/,
			`const CACHE_NAME = "omniconvert-shell-e2e-${revision}";`,
		);
	});
	const session = await createServiceWorkerSession(playwright[browserName], {
		...launchOptions,
		headless,
	});
	const { context } = session;
	try {
		const page = await context.newPage();
		await page.goto(server.origin);
		await page.waitForFunction(async () => {
			const registration = await navigator.serviceWorker.getRegistration("/");
			return Boolean(
				registration?.active && navigator.serviceWorker.controller,
			);
		});
		await expect
			.poll(() => page.evaluate(() => caches.keys()), { timeout: 10_000 })
			.toContain("omniconvert-shell-e2e-v1");
		revision = "v2";
		await page.evaluate(async () => {
			const registration = await navigator.serviceWorker.ready;
			await registration.update();
		});
		await expect
			.poll(
				() =>
					page.evaluate(async () => {
						const registration =
							await navigator.serviceWorker.getRegistration("/");
						return {
							waiting: registration?.waiting?.state ?? null,
							oldCache: (await caches.keys()).includes(
								"omniconvert-shell-e2e-v1",
							),
						};
					}),
				{ timeout: 10_000 },
			)
			.toEqual({ waiting: "installed", oldCache: true });
		expect(servedVersions).toContain("v2");
		await page.close();
		const replacement = await context.newPage();
		await replacement.goto(server.origin);
		await expect
			.poll(() => server.updateClaimStates, { timeout: 10_000 })
			.toContain("activated");
		expect(
			server.updateClaimStates.every((state) => state === "activated"),
		).toBe(true);
		await expect
			.poll(
				() =>
					replacement.evaluate(async () => {
						const registration =
							await navigator.serviceWorker.getRegistration("/");
						const names = await caches.keys();
						return {
							controlled: Boolean(
								registration?.active && navigator.serviceWorker.controller,
							),
							oldCache: names.includes("omniconvert-shell-e2e-v1"),
							newCache: names.includes("omniconvert-shell-e2e-v2"),
						};
					}),
				{ timeout: 10_000 },
			)
			.toEqual({ controlled: true, oldCache: false, newCache: true });
	} finally {
		try {
			await session.close();
		} finally {
			await server.close();
		}
	}
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
	// Model a native close notification arriving after the user's next Tab.
	// The browser already restores focus during close(); React cleanup must not
	// subsequently take it away from the next control.
	const previewElement = page.locator("dialog.preview-modal");
	await previewElement.evaluate((element) => {
		element.addEventListener(
			"close",
			(event) => event.stopImmediatePropagation(),
			{
				capture: true,
				once: true,
			},
		);
	});
	await page.keyboard.press("Escape");
	await expect(preview).toBeFocused();

	const download = card.getByRole("button", { name: "Download", exact: true });
	await tabUntilFocused(page, download);
	await expect(previewElement.locator("h2")).toHaveCount(1);
	await previewElement.evaluate((element) =>
		element.dispatchEvent(new Event("close")),
	);
	await expect(previewElement.locator("h2")).toHaveCount(0);
	await page.evaluate(
		() =>
			new Promise<void>((resolve) => {
				requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
			}),
	);
	await expect(download).toBeFocused();
	const downloadPromise = page.waitForEvent("download", { timeout: 10_000 });
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
