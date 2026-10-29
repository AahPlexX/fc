import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { createServer, type RequestListener, type Server } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { copyFile, cp, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { rootCertificates } from "node:tls";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const csp = [
	"default-src 'self'",
	"script-src 'self' 'wasm-unsafe-eval'",
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' data: blob:",
	"font-src 'self' data:",
	"connect-src 'self'",
	"worker-src 'self' blob:",
	"media-src 'self' blob:",
	"object-src 'none'",
	"form-action 'none'",
	"base-uri 'none'",
	"frame-ancestors 'none'",
].join("; ");

const artifactContents: Record<string, Buffer> = Object.fromEntries(
	Object.entries({
		"_headers": `/*\n  Content-Security-Policy: ${csp}\n`,
		"index.html": '<html><link href="/assets/index-a1.css"><script src="/assets/index-a1.js"></script></html>',
		"sw.js": "/* worker */",
		"manifest.webmanifest": '{"name":"Fixture"}',
		"icon.svg": "<svg></svg>",
		"THIRD_PARTY_NOTICES.txt": "notice",
		"sources.html": "<html>sources</html>",
		"sources/exifreader-4.51.0.zip": "PK fixture",
		"assets/index-a1.js": "export const ok = true;",
		"assets/index-a1.css": "body { color: black; }",
		"assets/pdf.worker-a1.mjs": "export const pdf = true;",
		"engines/core/0.12.10/ffmpeg-core.js": "export default 1;",
		"engines/core/0.12.10/ffmpeg-core.wasm": "\0asm",
		"engines/wrapper/0.12.15/worker.js": "export const worker = true;",
	}).map(([name, value]) => [name, Buffer.from(value)]),
);

type Fault =
	| "none"
	| "csp"
	| "csp-override"
	| "security-header"
	| "permissions-duplicate"
	| "cache"
	| "mime"
	| "stale"
	| "oversized"
	| "missing"
	| "redirect"
	| "spa-fallback"
	| "spa-scoped"
	| "large-404"
	| "split-cache";

let fault: Fault = "none";
let server: Server;
let serve: RequestListener;
let origin = "";
let temp = "";
let dist = "";
let manifestPath = "";
let originalManifest = "";
let requests: Array<{ method: string; path: string }> = [];

const runCommand = (args: string[], overrides: NodeJS.ProcessEnv = {}) =>
	new Promise<{ code: number | null; out: string; err: string }>((resolveResult, reject) => {
		const child = spawn(process.execPath, args, { cwd: process.cwd(), env: { ...process.env, ...overrides } });
		let out = "";
		let err = "";
		child.stdout.on("data", (part: Buffer) => { out += part.toString(); });
		child.stderr.on("data", (part: Buffer) => { err += part.toString(); });
		child.on("error", reject);
		child.on("close", (code) => resolveResult({ code, out, err }));
	});

const run = (target = origin, allowHttp = true) =>
	runCommand([
		resolve("scripts/verify-host.mjs"),
		target,
		"--dist",
		dist,
		"--manifest",
		manifestPath,
		...(allowHttp ? ["--allow-http-localhost"] : []),
	]);

beforeAll(async () => {
	temp = await mkdtemp(join(tmpdir(), "omniconvert-host-test-"));
	dist = join(temp, "dist");
	manifestPath = join(temp, "artifact-manifest.json");
	for (const [name, bytes] of Object.entries(artifactContents)) {
		const path = join(dist, name);
		await mkdir(dirname(path), { recursive: true });
		await writeFile(path, bytes);
	}
	originalManifest = JSON.stringify({
		format: "omniconvert-artifact-manifest/v1",
		gitRevision: "fixture",
		trackedDirty: false,
		artifacts: Object.entries(artifactContents).map(([path, bytes]) => ({
			path,
			sha256: createHash("sha256").update(bytes).digest("hex"),
		})),
	});
	await writeFile(manifestPath, originalManifest);
	serve = (req, res) => {
		const pathname = new URL(req.url ?? "/", origin).pathname;
		requests.push({ method: req.method ?? "", path: pathname });
		const path = pathname === "/" ? "index.html" : pathname.slice(1);
		const source = artifactContents[path];
		if (!source) {
			const scopedFallback = fault === "spa-scoped" &&
				["/assets/", "/engines/", "/sources/"].some((prefix) => pathname.startsWith(prefix));
			res.writeHead(fault === "spa-fallback" || scopedFallback ? 200 : 404, { "Content-Type": "text/html" });
			res.end(fault === "large-404" ? "x".repeat(100_000) : "<html>not found</html>");
			return;
		}
		if (fault === "missing" && path.endsWith("worker.js")) {
			res.writeHead(404).end();
			return;
		}
		if (fault === "redirect" && path.endsWith("ffmpeg-core.wasm")) {
			res.writeHead(302, { Location: "https://other.example/asset" }).end();
			return;
		}
		const ext = path.split(".").at(-1);
		const mime: Record<string, string> = {
			html: "text/html; charset=utf-8",
			js: "text/javascript; charset=utf-8",
			mjs: "application/javascript",
			css: "text/css",
			wasm: "application/wasm",
			webmanifest: "application/manifest+json",
			svg: "image/svg+xml",
			txt: "text/plain; charset=utf-8",
			zip: "application/zip",
		};
		let policy = csp;
		if (fault === "csp") policy = policy.replace("connect-src 'self'", "connect-src *");
		if (fault === "csp-override") policy += "; script-src-elem *";
		const immutable = path.startsWith("assets/") || path.startsWith("sources/");
		const cache = immutable ? "public, max-age=31536000, immutable" : "no-cache";
		res.setHeader("Content-Security-Policy", policy);
		if (fault !== "security-header") res.setHeader("X-Content-Type-Options", "nosniff");
		res.setHeader("Referrer-Policy", "no-referrer");
		res.setHeader("Permissions-Policy", fault === "permissions-duplicate"
			? "camera=(), camera = *, microphone=(), geolocation=()"
			: "camera=(), microphone=(), geolocation=()");
		res.setHeader("Cache-Control", fault === "split-cache" && immutable
			? ["public", "max-age=31536000", "immutable"]
			: fault === "cache" && immutable ? "public, max-age=30" : cache);
		res.setHeader("Content-Type", fault === "mime" && ext === "wasm" ? "text/html" : (mime[ext ?? ""] ?? "application/octet-stream"));
		let body = source;
		if (path.endsWith("ffmpeg-core.wasm") && fault === "stale") body = Buffer.from("\0asx");
		if (path.endsWith("ffmpeg-core.wasm") && fault === "oversized") body = Buffer.concat([body, Buffer.from("x")]);
		res.writeHead(200).end(body);
	};
	server = createServer(serve);
	await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
	const address = server.address();
	if (!address || typeof address === "string") throw new Error("Fixture server did not bind");
	origin = `http://127.0.0.1:${address.port}`;
});

beforeEach(() => { fault = "none"; requests = []; });
afterAll(async () => {
	if (server) await new Promise<void>((resolveClose, reject) => server.close((error) => error ? reject(error) : resolveClose()));
	if (temp) await rm(temp, { recursive: true, force: true });
});

describe("deployed host verification", () => {
	it("checks every artifact and real missing-asset responses using only GET requests", async () => {
		const result = await run();
		expect(result.code, result.err).toBe(0);
		const report = JSON.parse(result.out) as { verifiedAssets: number; missingAssetChecks: number; origin: string; artifactTrackedDirty: boolean };
		expect(report.origin).toBe(origin);
		expect(report.verifiedAssets).toBe(13);
		expect(report.missingAssetChecks).toBe(6);
		expect(report.artifactTrackedDirty).toBe(false);
		expect(requests.every((request) => request.method === "GET")).toBe(true);
		expect(requests.some((request) => request.path.endsWith(".js") && !artifactContents[request.path.slice(1)])).toBe(true);
		expect(requests.some((request) => request.path.endsWith(".wasm") && !artifactContents[request.path.slice(1)])).toBe(true);
		expect(requests.some((request) => request.path.startsWith("/assets/") && request.path.endsWith(".js") && !artifactContents[request.path.slice(1)])).toBe(true);
		expect(requests.some((request) => request.path.startsWith("/engines/core/") && request.path.endsWith(".wasm") && !artifactContents[request.path.slice(1)])).toBe(true);
		expect(requests.some((request) => request.path.startsWith("/engines/wrapper/") && request.path.endsWith(".js") && !artifactContents[request.path.slice(1)])).toBe(true);
		expect(requests.some((request) => request.path.startsWith("/sources/") && request.path.endsWith(".zip") && !artifactContents[request.path.slice(1)])).toBe(true);
	});

	it.each([
		["csp", /CSP/i],
		["csp-override", /CSP/i],
		["security-header", /X-Content-Type-Options/i],
		["permissions-duplicate", /Permissions-Policy/i],
		["cache", /Cache-Control/i],
		["mime", /Content-Type/i],
		["stale", /hash|digest/i],
		["oversized", /size|length/i],
		["missing", /404|status/i],
		["redirect", /302|redirect/i],
		["spa-fallback", /404/i],
		["spa-scoped", /404/i],
	] as const)("rejects a host with %s", async (problem, message) => {
		fault = problem;
		const result = await run();
		expect(result.code).not.toBe(0);
		expect(result.err).not.toContain("MODULE_NOT_FOUND");
		expect(result.err).toMatch(message);
	});

	it("refuses plain HTTP unless explicitly restricted to loopback tests", async () => {
		const noOverride = await run(origin, false);
		expect(noOverride.code).not.toBe(0);
		expect(noOverride.err).toMatch(/HTTPS/i);
		const remote = await run("http://example.invalid");
		expect(remote.code).not.toBe(0);
		expect(remote.err).toMatch(/HTTPS|loopback/i);
		expect(requests).toHaveLength(0);
	});

	it("rejects origins with credentials and does not print them", async () => {
		const result = await run(origin.replace("://", "://alice:secret@"));
		expect(result.code).not.toBe(0);
		expect(result.err).not.toContain("MODULE_NOT_FOUND");
		expect(result.err).toMatch(/origin|credentials/i);
		expect(result.err).not.toContain("secret");
		expect(requests).toHaveLength(0);
	});

	it("rejects a locally changed artifact before contacting the host", async () => {
		const path = join(dist, "sw.js");
		const original = await readFile(path);
		try {
			await writeFile(path, "changed locally");
			const result = await run();
			expect(result.code).not.toBe(0);
			expect(result.err).toMatch(/artifact|manifest|hash/i);
			expect(requests).toHaveLength(0);
		} finally {
			await writeFile(path, original);
		}
	});

	it("rejects paths escaping the local artifact before contacting the host", async () => {
		const manifest = JSON.parse(originalManifest) as { artifacts: Array<{ path: string; sha256: string }> };
		manifest.artifacts.push({ path: "../outside", sha256: "0".repeat(64) });
		try {
			await writeFile(manifestPath, JSON.stringify(manifest));
			const result = await run();
			expect(result.code).not.toBe(0);
			expect(result.err).not.toContain("MODULE_NOT_FOUND");
			expect(result.err).toMatch(/path/i);
			expect(requests).toHaveLength(0);
		} finally {
			await writeFile(manifestPath, originalManifest);
		}
	});

	it("rejects a manifest that omits a local artifact before contacting the host", async () => {
		const extra = join(dist, "assets", "unlisted.js");
		try {
			await writeFile(extra, "extra asset");
			const result = await run();
			expect(result.code).not.toBe(0);
			expect(result.err).toMatch(/artifact|manifest/i);
			expect(requests).toHaveLength(0);
		} finally {
			await rm(extra, { force: true });
		}
	});

	it("uses its default artifact paths in a checkout containing spaces", async () => {
		const project = join(temp, "project with spaces");
		await mkdir(join(project, "scripts"), { recursive: true });
		await mkdir(join(project, "release-results"), { recursive: true });
		await cp(dist, join(project, "dist"), { recursive: true });
		await copyFile(resolve("scripts/verify-host.mjs"), join(project, "scripts", "verify-host.mjs"));
		await writeFile(join(project, "release-results", "artifact-manifest.json"), originalManifest);
		const result = await runCommand([join(project, "scripts", "verify-host.mjs"), origin, "--allow-http-localhost"]);
		expect(result.code, result.err).toBe(0);
		expect(JSON.parse(result.out).verifiedAssets).toBe(13);
	});

	it("accepts pnpm's argument separator", async () => {
		const result = await runCommand([
			resolve("scripts/verify-host.mjs"), "--", origin, "--dist", dist,
			"--manifest", manifestPath, "--allow-http-localhost",
		]);
		expect(result.code, result.err).toBe(0);
	});

	it.each(["large-404", "split-cache"] as const)("accepts a valid host with %s", async (condition) => {
		fault = condition;
		const result = await run();
		expect(result.code, result.err).toBe(0);
	});

	it("rejects an unknown asset type before claiming to have checked its MIME type", async () => {
		const path = "assets/unlisted-type.bin";
		const bytes = Buffer.from("binary");
		const manifest = JSON.parse(originalManifest) as { artifacts: Array<{ path: string; sha256: string }> };
		artifactContents[path] = bytes;
		manifest.artifacts.push({ path, sha256: createHash("sha256").update(bytes).digest("hex") });
		try {
			await writeFile(join(dist, path), bytes);
			await writeFile(manifestPath, JSON.stringify(manifest));
			const result = await run();
			expect(result.code).not.toBe(0);
			expect(result.err).toMatch(/MIME|Content-Type/i);
			expect(requests).toHaveLength(0);
		} finally {
			delete artifactContents[path];
			await rm(join(dist, path), { force: true });
			await writeFile(manifestPath, originalManifest);
		}
	});

	it("preserves the manifest's dirty-source flag in its report", async () => {
		const manifest = JSON.parse(originalManifest) as { trackedDirty: boolean };
		manifest.trackedDirty = true;
		try {
			await writeFile(manifestPath, JSON.stringify(manifest));
			const result = await run();
			expect(result.code, result.err).toBe(0);
			expect(JSON.parse(result.out).artifactTrackedDirty).toBe(true);
		} finally {
			await writeFile(manifestPath, originalManifest);
		}
	});

	it("rejects a manifest with no source revision before contacting the host", async () => {
		const manifest = JSON.parse(originalManifest) as { gitRevision: string | null };
		manifest.gitRevision = null;
		try {
			await writeFile(manifestPath, JSON.stringify(manifest));
			const result = await run();
			expect(result.code).not.toBe(0);
			expect(result.err).toMatch(/manifest|revision/i);
			expect(requests).toHaveLength(0);
		} finally {
			await writeFile(manifestPath, originalManifest);
		}
	});

	it.skipIf(!(() => {
		const help = spawnSync("openssl", ["req", "-help"], { encoding: "utf8" });
		return (help.stdout ?? "").includes("-addext") || (help.stderr ?? "").includes("-addext");
	})())(
		"verifies HTTPS certificates and identifies a loopback host", async () => {
			const keyFile = join(temp, "test-key.pem");
			const certFile = join(temp, "test-cert.pem");
			const rootsFile = join(temp, "test-roots.pem");
			const trustedFile = join(temp, "test-trusted-roots.pem");
			const generated = spawnSync("openssl", [
				"req", "-x509", "-newkey", "rsa:2048", "-nodes", "-sha256", "-days", "1",
				"-keyout", keyFile, "-out", certFile, "-subj", "/CN=localhost",
				"-addext", "subjectAltName=IP:127.0.0.1,DNS:localhost",
			], { stdio: "ignore" });
			expect(generated.status).toBe(0);
			const cert = await readFile(certFile);
			await writeFile(rootsFile, rootCertificates.join("\n"));
			await writeFile(trustedFile, `${rootCertificates.join("\n")}\n${cert.toString()}`);
			const secureServer = createHttpsServer({ key: await readFile(keyFile), cert }, serve);
			await new Promise<void>((resolveListen) => secureServer.listen(0, "127.0.0.1", resolveListen));
			try {
				const address = secureServer.address();
				if (!address || typeof address === "string") throw new Error("TLS fixture did not bind");
				const target = `https://127.0.0.1:${address.port}`;
				const args = [resolve("scripts/verify-host.mjs"), target, "--dist", dist, "--manifest", manifestPath];
				const untrusted = await runCommand(args, { CURL_CA_BUNDLE: rootsFile });
				expect(untrusted.code).not.toBe(0);
				expect(untrusted.err).toMatch(/curl exit 60/i);
				const trusted = await runCommand(args, { CURL_CA_BUNDLE: trustedFile });
				expect(trusted.code, trusted.err).toBe(0);
				expect(JSON.parse(trusted.out).loopbackTest).toBe(true);
			} finally {
				await new Promise<void>((resolveClose, reject) => secureServer.close((error) => error ? reject(error) : resolveClose()));
			}
		},
	);
});
