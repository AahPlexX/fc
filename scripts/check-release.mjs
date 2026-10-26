import { createHash } from "node:crypto";
import {
	mkdirSync,
	readFileSync,
	readdirSync,
	lstatSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { gzipSync } from "node:zlib";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(process.argv[2] ?? join(root, "dist"));
const output = join(root, "release-results");
// A failed re-check must not leave evidence from an older successful artifact.
for (const name of ["artifact-manifest.json", "SHA256SUMS"]) {
	rmSync(join(output, name), { force: true });
}
const errors = [];
const fail = (message) => errors.push(message);
const read = (path) => readFileSync(path);
const text = (path) => read(path).toString("utf8");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const require = createRequire(import.meta.url);
const inside = (base, path) => {
	const rel = relative(base, path);
	return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== "..");
};

function artifactFile(path) {
	const target = resolve(dist, `.${path.startsWith("/") ? path : `/${path}`}`);
	if (!inside(dist, target)) throw new Error(`Artifact path escapes dist: ${path}`);
	let current = dist;
	for (const part of relative(dist, target).split(sep).filter(Boolean)) {
		current = join(current, part);
		const stat = lstatSync(current);
		if (stat.isSymbolicLink()) throw new Error(`Artifact contains symlink: ${current}`);
	}
	if (!lstatSync(target).isFile()) throw new Error(`Artifact path is not a file: ${path}`);
	return target;
}

function requiredArtifact(path, message = `Missing required artifact ${path}`) {
	try {
		return artifactFile(path);
	} catch (error) {
		fail(`${message}: ${error.message}`);
		return null;
	}
}

function packageDirectory(entry, expectedName) {
	let current = dirname(entry);
	while (current !== dirname(current)) {
		try {
			const manifest = JSON.parse(text(join(current, "package.json")));
			if (manifest.name === expectedName) return current;
		} catch {}
		current = dirname(current);
	}
	throw new Error(`Cannot locate installed package ${expectedName}`);
}

function checkPins() {
	const pkg = JSON.parse(text(join(root, "package.json")));
	const lock = text(join(root, "pnpm-lock.yaml"));
	const pnpmVersion = pkg.packageManager?.match(/^pnpm@(.+)$/)?.[1];
	if (!pnpmVersion || !/^\d+\.\d+\.\d+$/.test(pnpmVersion))
		fail("package.json packageManager must pin pnpm to an exact version");
	const pm = lock.match(/packageManagerDependencies:\s*\n\s+pnpm:\s*\n\s+specifier:\s+(\S+)\s*\n\s+version:\s+(\S+)/);
	if (!pm || pm[1] !== pnpmVersion || pm[2] !== pnpmVersion)
		fail(`pnpm-lock.yaml packageManagerDependencies must match pnpm@${pnpmVersion ?? "<missing>"}`);
	const importerStart = lock.lastIndexOf("importers:\n");
	const importer = importerStart < 0 ? "" : lock.slice(importerStart).split("\npackages:\n")[0];
	for (const [section, dependencies] of Object.entries({
		dependencies: pkg.dependencies ?? {},
		devDependencies: pkg.devDependencies ?? {},
	})) {
		for (const [name, pin] of Object.entries(dependencies)) {
			if (typeof pin !== "string" || !/^\d+\.\d+\.\d+$/.test(pin)) {
				fail(`${section}.${name} must use an exact version pin`);
				continue;
			}
			const key = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replaceAll("'", "\\'");
			const entry = new RegExp(`^\\s{6}'?${key}'?:\\s*\\n\\s{8}specifier:\\s+(\\S+)\\s*\\n\\s{8}version:\\s+(\\S+)`, "m").exec(importer);
			if (!entry || entry[1] !== pin || !entry[2].startsWith(`${pin}(`) && entry[2] !== pin)
				fail(`pnpm-lock.yaml importer does not pin ${name}@${pin}`);
			try {
				const installed = JSON.parse(text(join(root, "node_modules", name, "package.json")));
				if (installed.version !== pin)
					fail(`Installed ${name} is ${installed.version}; expected ${pin}`);
			} catch {
				fail(`Installed manifest missing for ${name}@${pin}; run frozen install before release:check`);
			}
		}
	}
}

function checkBuild() {
	const htmlPath = requiredArtifact("index.html");
	if (!htmlPath) return;
	const html = text(htmlPath);
	const refs = [...html.matchAll(/(?:src|href)=["'](\/assets\/[^"']+\.(?:js|css))["']/g)].map((m) => m[1]);
	if (!refs.some((path) => path.endsWith(".js")) || !refs.some((path) => path.endsWith(".css")))
		fail("dist/index.html must reference an entry JavaScript file and stylesheet under /assets/");
	let gzipBytes = 0;
	for (const path of refs) {
		const file = requiredArtifact(path, `Broken index entry reference ${path}`);
		if (file) gzipBytes += gzipSync(read(file)).length;
	}
	if (gzipBytes > 150000) fail(`Initial JavaScript/CSS gzip is ${gzipBytes} bytes; limit is 150000`);

	const swPath = requiredArtifact("sw.js");
	if (swPath) {
		const sw = text(swPath);
		if (/__[A-Z_]+__/.test(sw)) fail("dist/sw.js still contains an unsubstituted build token");
		const version = /const CACHE_NAME\s*=\s*["']omniconvert-shell-([a-f0-9]{16})["']/.exec(sw)?.[1];
		if (!version) fail("dist/sw.js must contain a 16-character content version in CACHE_NAME");
		const precacheText = /const PRECACHE_ASSETS\s*=\s*(\[[^;]*\]);/.exec(sw)?.[1];
		let precache;
		try {
			precache = JSON.parse(precacheText);
		} catch {
			fail("dist/sw.js PRECACHE_ASSETS must be a valid JSON array");
		}
		if (Array.isArray(precache)) {
			for (const path of precache) {
				if (typeof path !== "string" || !path.startsWith("/") || path.includes("..") || /^[a-z]+:/i.test(path)) {
					fail(`Invalid same-origin precache reference: ${path}`);
					continue;
				}
				if (path.startsWith("/engines/") || path.endsWith(".wasm"))
					fail(`Heavy engine must not be precached: ${path}`);
				const file = path === "/" ? "index.html" : path.slice(1);
				requiredArtifact(file, `Broken service-worker precache reference ${path}`);
			}
		}
	}

	const manifestPath = requiredArtifact("manifest.webmanifest");
	if (manifestPath) {
		try {
			const manifest = JSON.parse(text(manifestPath));
			for (const path of [manifest.start_url, manifest.scope, ...(manifest.icons ?? []).map((icon) => icon.src)]) {
				if (typeof path !== "string" || !path.startsWith("/") || path.includes("..")) {
					fail(`Invalid manifest asset path: ${path}`);
					continue;
				}
				if (path !== "/") requiredArtifact(path.slice(1), `Broken manifest reference ${path}`);
			}
		} catch (error) {
			fail(`Invalid dist/manifest.webmanifest: ${error.message}`);
		}
	}
	const icon = requiredArtifact("icon.svg");
	if (icon && !text(icon).includes("<svg")) fail("dist/icon.svg is not an SVG document");

	try {
		const dependencies = JSON.parse(text(join(root, "package.json"))).dependencies;
		const corePublic = `engines/core/${dependencies["@ffmpeg/core"]}`;
		const wrapperPublic = `engines/wrapper/${dependencies["@ffmpeg/ffmpeg"]}`;
		const coreDir = join(packageDirectory(require.resolve("@ffmpeg/core"), "@ffmpeg/core"), "dist", "esm");
		for (const name of ["ffmpeg-core.js", "ffmpeg-core.wasm"]) {
			const artifact = requiredArtifact(`${corePublic}/${name}`, `FFmpeg core asset is missing: ${name}`);
			if (artifact && !read(artifact).equals(read(join(coreDir, name))))
				fail(`FFmpeg core asset differs from installed @ffmpeg/core: ${name}`);
		}
		const wasm = requiredArtifact(`${corePublic}/ffmpeg-core.wasm`);
		if (wasm && !read(wasm).subarray(0, 4).equals(Buffer.from([0, 0x61, 0x73, 0x6d])))
			fail("FFmpeg WASM does not have the WebAssembly magic header");

		const wrapperDir = join(packageDirectory(require.resolve("@ffmpeg/ffmpeg/worker"), "@ffmpeg/ffmpeg"), "dist", "esm");
		const expected = readdirSync(wrapperDir).filter((name) => name.endsWith(".js")).sort();
		const emitted = readdirSync(join(dist, wrapperPublic)).filter((name) => name.endsWith(".js")).sort();
		if (!expected.includes("worker.js")) fail("Installed FFmpeg wrapper package has no worker.js asset");
		if (JSON.stringify(emitted) !== JSON.stringify(expected))
			fail("Emitted FFmpeg wrapper JS asset list differs from installed wrapper dist/esm");
		for (const name of expected) {
			const artifact = requiredArtifact(`${wrapperPublic}/${name}`, `FFmpeg wrapper asset is missing: ${name}`);
			if (artifact && !read(artifact).equals(read(join(wrapperDir, name))))
				fail(`FFmpeg wrapper asset differs from installed @ffmpeg/ffmpeg: ${name}`);
		}
	} catch (error) {
		fail(`FFmpeg installed-source verification failed: ${error.message}`);
	}
	if (!readdirSync(join(dist, "assets")).some((name) => /^pdf\.worker\..+\.(?:mjs|js)$/.test(name)))
		fail("PDF.js worker is missing under dist/assets");

	const headersPath = requiredArtifact("_headers");
	if (headersPath) {
		const headers = text(headersPath);
		const csp = /^\s*Content-Security-Policy:\s*(.+)$/im.exec(headers)?.[1] ?? "";
		const directives = new Map(csp.split(";").map((part) => {
			const [name, ...values] = part.trim().split(/\s+/);
			return [name, values];
		}));
		for (const [name, expected] of Object.entries({
			"default-src": ["'self'"],
			"script-src": ["'self'", "'wasm-unsafe-eval'"],
			"connect-src": ["'self'"],
			"object-src": ["'none'"],
			"frame-ancestors": ["'none'"],
			"base-uri": ["'none'"],
			"form-action": ["'none'"],
		})) {
			if (JSON.stringify(directives.get(name)) !== JSON.stringify(expected))
				fail(`Production CSP must set ${name} ${expected.join(" ")} exactly`);
		}
		for (const [header, value] of [["X-Content-Type-Options", "nosniff"], ["Referrer-Policy", "no-referrer"], ["Permissions-Policy", "camera=(), microphone=(), geolocation=()"]])
			if (!new RegExp(`^\\s*${header}:\\s*${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "im").test(headers))
				fail(`Production _headers missing ${header}: ${value}`);
		for (const path of ["/", "/index.html", "/sw.js", "/manifest.webmanifest", "/icon.svg", "/engines/*"])
			if (!new RegExp(`^${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\n\\s*Cache-Control:\\s*no-cache$`, "m").test(headers))
				fail(`Production _headers must set no-cache for ${path}`);
		if (!/^\/assets\/\*\s*\n\s*Cache-Control:\s*public,\s*max-age=31536000,\s*immutable\s*$/m.test(headers))
			fail("Production _headers must make fingerprinted /assets/* immutable");
	}

	const noticePath = requiredArtifact("THIRD_PARTY_NOTICES.txt");
	if (noticePath) {
		const notices = text(noticePath);
		if (!read(join(root, "public/THIRD_PARTY_NOTICES.txt")).equals(read(noticePath)))
			fail("dist/THIRD_PARTY_NOTICES.txt does not byte-match public/THIRD_PARTY_NOTICES.txt");
		for (const [name, pin] of Object.entries({
			"@ffmpeg/core": "0.12.10",
			"@ffmpeg/ffmpeg": "0.12.15",
			react: "19.3.1",
			"react-dom": "19.3.1",
			"pdfjs-dist": "6.4.299",
			"pdf-lib": "1.17.1",
			exifreader: "4.51.0",
			papaparse: "5.7.0",
			jszip: "3.10.2",
			piexifjs: "1.0.6",
		})) {
			const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			if (!new RegExp(`${escaped}(?:\\s+|@)${pin}(?![\\d.])`, "i").test(notices))
				fail(`Third-party notices missing pinned runtime attribution: ${name}@${pin}`);
		}
		if (!/GPL-2\.0-or-later/i.test(notices) || !/MIT License/i.test(notices))
			fail("Third-party notices must include the pinned FFmpeg core GPL and wrapper MIT license texts");
	}
}

function collectDist(dir, prefix = "") {
	const result = [];
	for (const name of readdirSync(dir).sort()) {
		const path = join(dir, name);
		const stat = lstatSync(path);
		if (stat.isSymbolicLink()) throw new Error(`dist contains symlink: ${path}`);
		const rel = prefix ? `${prefix}/${name}` : name;
		if (stat.isDirectory()) result.push(...collectDist(path, rel));
		else if (stat.isFile()) result.push([rel, path]);
		else throw new Error(`dist contains unsupported file type: ${path}`);
	}
	return result;
}

try {
	const distStat = lstatSync(dist);
	if (distStat.isSymbolicLink() || !distStat.isDirectory()) throw new Error(`dist must be a real directory: ${dist}`);
	checkPins();
	checkBuild();
	if (errors.length) {
		console.error("Release artifact check failed:");
		for (const error of errors) console.error(`- ${error}`);
		process.exit(1);
	}
	const distFiles = collectDist(dist).map(([path, file]) => ({ path, sha256: sha256(read(file)) })).sort((a, b) => a.path.localeCompare(b.path));
	const inputFiles = ["package.json", "pnpm-lock.yaml", "PRD.md"].map((path) => ({ path, sha256: sha256(read(join(root, path))) }));
	const gitRevision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
	const trackedDirty = execFileSync("git", ["status", "--porcelain", "--untracked-files=no"], { cwd: root, encoding: "utf8" }).trim().length > 0;
	const manifest = {
		format: "omniconvert-artifact-manifest/v1",
		gitRevision,
		trackedDirty,
		signedProvenance: false,
		sourceAttestation: "UNVERIFIED",
		correspondingSourceAndExactBinaryReproducibility: "UNVERIFIED",
		distDirectory: relative(root, dist) || ".",
		initialGzipBytes: (() => {
			const html = text(join(dist, "index.html"));
			const refs = [...html.matchAll(/(?:src|href)=["'](\/assets\/[^"']+\.(?:js|css))["']/g)].map((m) => m[1]);
			return refs.reduce((sum, path) => sum + gzipSync(read(artifactFile(path))).length, 0);
		})(),
		inputs: inputFiles,
		artifacts: distFiles,
		manifestNotSelfHashed: true,
	};
	const sums = [...inputFiles.map((file) => [file.path, file.sha256]), ...distFiles.map((file) => [`${relative(root, dist) || "dist"}/${file.path}`, file.sha256])]
		.sort(([a], [b]) => a.localeCompare(b)).map(([path, hash]) => `${hash}  ${path}`).join("\n");
	mkdirSync(output, { recursive: true });
	writeFileSync(join(output, "artifact-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
	writeFileSync(join(output, "SHA256SUMS"), `${sums}\n`);
} catch (error) {
	fail(error.message);
}

if (errors.length) {
	console.error("Release artifact check failed:");
	for (const error of errors) console.error(`- ${error}`);
	process.exitCode = 1;
} else {
	console.log(`Release artifact checks passed for ${dist}`);
	console.log("Wrote release-results/artifact-manifest.json and release-results/SHA256SUMS");
}
