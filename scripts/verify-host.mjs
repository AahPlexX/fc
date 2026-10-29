import { createHash, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import {
	createReadStream,
	lstatSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const mimeTypes = {
	html: /^text\/html$/,
	js: /^(?:text|application)\/(?:x-)?(?:java|ecma)script$/,
	mjs: /^(?:text|application)\/(?:x-)?(?:java|ecma)script$/,
	css: /^text\/css$/,
	wasm: /^application\/wasm$/,
	webmanifest: /^application\/manifest\+json$/,
	svg: /^image\/svg\+xml$/,
	txt: /^text\/plain$/,
	zip: /^application\/zip$/,
};
let dist = join(root, "dist");
let manifestFile = join(root, "release-results", "artifact-manifest.json");
let allowHttpLocalhost = false;
let originArgument;

const fail = (message) => { throw new Error(message); };

const parseArguments = () => {
	if (args[0] === "--") args.shift();
	while (args.length) {
		const argument = args.shift();
		if (argument === "--allow-http-localhost") {
			allowHttpLocalhost = true;
		} else if (argument === "--dist" || argument === "--manifest") {
			const value = args.shift();
			if (!value || value.startsWith("--")) fail(`Missing path for ${argument}`);
			if (argument === "--dist") dist = resolve(value);
			else manifestFile = resolve(value);
		} else if (argument && !argument.startsWith("-") && !originArgument) {
			originArgument = argument;
		} else {
			fail("Usage: pnpm release:verify-host -- https://example.com");
		}
	}
	if (!originArgument) fail("Provide an HTTPS origin to verify.");
	let parsed;
	try {
		parsed = new URL(originArgument);
	} catch {
		fail("Provide a valid HTTPS origin.");
	}
	if (parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash)
		fail("Provide an origin without credentials, path, query, or fragment.");
	const local = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
	if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && allowHttpLocalhost && local))
		fail("An HTTPS origin is required; HTTP is available only for explicit loopback tests.");
	return parsed;
};

const safePath = (path) => {
	if (typeof path !== "string" || !/^[A-Za-z0-9._/-]+$/.test(path) ||
		path.startsWith("/") || path.split("/").some((part) => !part || part === "." || part === ".."))
		fail("Invalid artifact path in manifest.");
	return path;
};

const localArtifact = (path) => {
	let current = dist;
	for (const part of safePath(path).split("/")) {
		current = join(current, part);
		if (lstatSync(current).isSymbolicLink()) fail(`Artifact path contains a symlink: ${path}`);
	}
	const stat = lstatSync(current);
	if (!stat.isFile()) fail(`Artifact is not a regular file: ${path}`);
	return { path: current, size: stat.size };
};

const hashFile = async (path) => {
	const hash = createHash("sha256");
	for await (const chunk of createReadStream(path)) hash.update(chunk);
	return hash.digest("hex");
};

const artifactPaths = (directory, prefix = "") => {
	const paths = [];
	for (const name of readdirSync(directory)) {
		const path = prefix ? `${prefix}/${name}` : name;
		safePath(path);
		const file = join(directory, name);
		const stat = lstatSync(file);
		if (stat.isSymbolicLink()) fail(`Artifact path contains a symlink: ${path}`);
		if (stat.isDirectory()) paths.push(...artifactPaths(file, path));
		else if (stat.isFile()) paths.push(path);
		else fail(`Artifact path is not a regular file: ${path}`);
	}
	return paths;
};

const parsePolicy = (text) => {
	const result = new Map();
	for (const item of text.split(";")) {
		const words = item.trim().split(/\s+/).filter(Boolean);
		if (!words.length) continue;
		const name = words.shift().toLowerCase();
		if (result.has(name)) fail(`CSP contains a duplicate directive: ${name}`);
		result.set(name, [...new Set(words)].sort());
	}
	return result;
};

const expectedPolicy = () => {
	const contents = readFileSync(join(dist, "_headers"), "utf8");
	const value = /^\s*Content-Security-Policy:\s*(.+)$/im.exec(contents)?.[1];
	if (!value) fail("Artifact CSP is missing.");
	const policy = parsePolicy(value);
	const required = {
		"default-src": ["'self'"],
		"script-src": ["'self'", "'wasm-unsafe-eval'"],
		"style-src": ["'self'", "'unsafe-inline'"],
		"img-src": ["'self'", "data:", "blob:"],
		"font-src": ["'self'", "data:"],
		"connect-src": ["'self'"],
		"worker-src": ["'self'", "blob:"],
		"media-src": ["'self'", "blob:"],
		"object-src": ["'none'"],
		"form-action": ["'none'"],
		"base-uri": ["'none'"],
		"frame-ancestors": ["'none'"],
	};
	for (const [name, values] of Object.entries(required))
		if (JSON.stringify(policy.get(name)) !== JSON.stringify([...values].sort()))
			fail(`Artifact CSP does not meet the required ${name} policy.`);
	for (const name of policy.keys())
		if (!(name in required)) fail(`Unexpected artifact CSP directive: ${name}`);
	return policy;
};

const validateManifest = async () => {
	if (lstatSync(dist).isSymbolicLink() || !lstatSync(dist).isDirectory())
		fail("Artifact directory must be a real directory.");
	const manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
	if (manifest.format !== "omniconvert-artifact-manifest/v1" ||
		!Array.isArray(manifest.artifacts) || typeof manifest.trackedDirty !== "boolean" ||
		typeof manifest.gitRevision !== "string" || !manifest.gitRevision.trim())
		fail("Invalid artifact manifest.");
	const artifacts = new Map();
	for (const entry of manifest.artifacts) {
		const path = safePath(entry?.path);
		if (artifacts.has(path) || !/^[a-f0-9]{64}$/.test(entry.sha256 ?? ""))
			fail(`Invalid or duplicate artifact manifest entry: ${path}`);
		const file = localArtifact(path);
		if (await hashFile(file.path) !== entry.sha256)
			fail(`Local artifact hash differs from the manifest: ${path}`);
		artifacts.set(path, { ...file, sha256: entry.sha256 });
	}
	if (JSON.stringify(artifactPaths(dist).sort()) !== JSON.stringify([...artifacts.keys()].sort()))
		fail("Artifact directory contents differ from the manifest.");
	for (const path of artifacts.keys()) {
		if (path !== "_headers" && !mimeTypes[path.split(".").at(-1).toLowerCase()])
			fail(`No supported MIME type is defined for artifact: ${path}`);
	}
	for (const path of ["_headers", "index.html", "sw.js", "manifest.webmanifest", "icon.svg", "sources.html", "THIRD_PARTY_NOTICES.txt"])
		if (!artifacts.has(path)) fail(`Artifact manifest is missing ${path}`);
	const paths = [...artifacts.keys()];
	for (const [description, pattern] of [
		["ExifReader source archive", /^sources\/exifreader-[\d.]+\.zip$/],
		["FFmpeg core JavaScript", /^engines\/core\/[\d.]+\/ffmpeg-core\.js$/],
		["FFmpeg core WASM", /^engines\/core\/[\d.]+\/ffmpeg-core\.wasm$/],
		["FFmpeg wrapper worker", /^engines\/wrapper\/[\d.]+\/worker\.js$/],
		["PDF worker", /^assets\/pdf\.worker.*\.(?:js|mjs)$/],
	])
		if (!paths.some((path) => pattern.test(path))) fail(`Artifact manifest is missing ${description}.`);
	const html = readFileSync(join(dist, "index.html"), "utf8");
	const entryPaths = [...html.matchAll(/(?:src|href)=["'](\/assets\/[^"']+\.(?:js|css))["']/g)].map((match) => match[1].slice(1));
	if (!entryPaths.some((path) => path.endsWith(".js")) || !entryPaths.some((path) => path.endsWith(".css")))
		fail("Artifact index must reference entry JavaScript and CSS.");
	for (const path of entryPaths)
		if (!artifacts.has(path)) fail(`Artifact manifest is missing entry path: ${path}`);
	return { manifest, artifacts, policy: expectedPolicy() };
};

const parseHeaders = (contents) => {
	const blocks = contents.split(/\r?\n\r?\n/).filter((block) => /^HTTP\/\S+\s+\d{3}/i.test(block));
	if (!blocks.length) fail("Host response has no HTTP status.");
	const lines = blocks.at(-1).split(/\r?\n/);
	const status = Number(/^HTTP\/\S+\s+(\d{3})/i.exec(lines.shift())?.[1]);
	const headers = new Map();
	for (const line of lines) {
		const separator = line.indexOf(":");
		if (separator < 1) continue;
		const name = line.slice(0, separator).trim().toLowerCase();
		const values = headers.get(name) ?? [];
		values.push(line.slice(separator + 1).trim());
		headers.set(name, values);
	}
	return { status, headers };
};

let requestId = 0;
const fetchAsset = (origin, path, maxBytes, temp, statusOnly = false) => new Promise((resolveRequest, reject) => {
	const headerFile = join(temp, `headers-${requestId++}`);
	const url = new URL(path, origin);
	const child = spawn("curl", [
		"-q", "--silent", "--show-error", "--compressed",
		"--connect-timeout", "15", "--max-time", "60",
		"--proto", origin.protocol === "https:" ? "=https" : "=http",
		"--header", "Accept-Encoding: identity",
		"--request", "GET", "--dump-header", headerFile, "--output", "-", url.href,
	], { stdio: ["ignore", "pipe", "pipe"] });
	const hash = createHash("sha256");
	let size = 0;
	let oversized = false;
	child.stdout.on("data", (chunk) => {
		size += chunk.length;
		if (size > maxBytes && !oversized) {
			oversized = true;
			child.kill();
		} else if (!oversized) hash.update(chunk);
	});
	child.stderr.resume();
	child.once("error", () => reject(new Error("Unable to run curl; install it to verify a host.")));
	child.once("close", (code) => {
		try {
			if (oversized && !statusOnly) fail(`Host response size exceeds the expected length: ${path}`);
			if (code !== 0 && !(statusOnly && oversized))
				fail(`Host request failed for ${path} (curl exit ${code}).`);
			const response = parseHeaders(readFileSync(headerFile, "utf8"));
			resolveRequest({ ...response, size, sha256: hash.digest("hex") });
		} catch (error) {
			reject(error);
		}
	});
});

const singleHeader = (headers, name, path) => {
	const values = headers.get(name.toLowerCase()) ?? [];
	if (values.length !== 1) fail(`Missing or duplicate ${name} header: ${path}`);
	return values[0];
};

const checkHeaders = (path, response, policy) => {
	const actual = parsePolicy(singleHeader(response.headers, "Content-Security-Policy", path));
	for (const [name, values] of policy)
		if (JSON.stringify(actual.get(name)) !== JSON.stringify(values)) fail(`Host CSP differs for ${name}: ${path}`);
	for (const name of actual.keys())
		if (!policy.has(name) && !["upgrade-insecure-requests", "block-all-mixed-content"].includes(name))
			fail(`Unexpected host CSP directive ${name}: ${path}`);
	if (singleHeader(response.headers, "X-Content-Type-Options", path).toLowerCase() !== "nosniff")
		fail(`Invalid X-Content-Type-Options header: ${path}`);
	if (singleHeader(response.headers, "Referrer-Policy", path).toLowerCase() !== "no-referrer")
		fail(`Invalid Referrer-Policy header: ${path}`);
	const permissions = singleHeader(response.headers, "Permissions-Policy", path).toLowerCase().split(",").map((part) => part.trim());
	for (const name of ["camera", "microphone", "geolocation"]) {
		const entries = permissions.filter((part) => new RegExp(`^${name}\\s*=`).test(part));
		if (entries.length !== 1 || entries[0].replace(/\s/g, "") !== `${name}=()`)
			fail(`Invalid Permissions-Policy for ${name}: ${path}`);
	}
	const type = singleHeader(response.headers, "Content-Type", path).split(";")[0].trim().toLowerCase();
	const extension = path === "/" ? "html" : path.split(".").at(-1).toLowerCase();
	if (!mimeTypes[extension]?.test(type)) fail(`Invalid Content-Type for ${path}.`);
	const cacheHeaders = response.headers.get("cache-control") ?? [];
	if (!cacheHeaders.length) fail(`Missing Cache-Control header: ${path}`);
	const cache = cacheHeaders.flatMap((value) => value.toLowerCase().split(",")).map((part) => part.trim());
	const immutable = path.startsWith("/assets/") || path.startsWith("/sources/");
	const revalidate = ["/", "/index.html", "/sw.js", "/manifest.webmanifest", "/icon.svg", "/sources.html", "/THIRD_PARTY_NOTICES.txt"].includes(path) || path.startsWith("/engines/");
	if (revalidate && !cache.includes("no-cache")) fail(`Cache-Control must revalidate ${path}.`);
	if (immutable) {
		const ages = cache.map((part) => /^max-age\s*=\s*"?(\d+)"?$/.exec(part)?.[1]).filter(Boolean);
		if (!cache.includes("public") || !cache.includes("immutable") || ages.length !== 1 || Number(ages[0]) < 31536000 ||
			cache.some((part) => ["private", "no-cache", "no-store"].includes(part)))
			fail(`Cache-Control must make versioned assets immutable: ${path}`);
	}
};

let temporaryDirectory;
try {
	const origin = parseArguments();
	const { manifest, artifacts, policy } = await validateManifest();
	temporaryDirectory = mkdtempSync(join(tmpdir(), "omniconvert-host-"));
	console.error(`Checking ${artifacts.size - 1} static artifacts at ${origin.origin}...`);
	const targets = [["/", artifacts.get("index.html")], ...[...artifacts].filter(([path]) => path !== "_headers").map(([path, info]) => [`/${path}`, info])];
	for (const [path, expected] of targets) {
		const response = await fetchAsset(origin, path, expected.size, temporaryDirectory);
		if (response.status !== 200) fail(`Expected status 200 for ${path}; got ${response.status}.`);
		checkHeaders(path, response, policy);
		if (response.size !== expected.size) fail(`Host response length differs from local artifact: ${path}`);
		if (response.sha256 !== expected.sha256) fail(`Host artifact hash differs from local artifact: ${path}`);
	}
	const nonce = randomBytes(12).toString("hex");
	const core = [...artifacts.keys()].find((path) => /^engines\/core\/[\d.]+\/ffmpeg-core\.wasm$/.test(path));
	const wrapper = [...artifacts.keys()].find((path) => /^engines\/wrapper\/[\d.]+\/worker\.js$/.test(path));
	if (!core || !wrapper) fail("Artifact manifest is missing engine paths.");
	const missing = [
		`/__omniconvert_missing_${nonce}.js`,
		`/__omniconvert_missing_${nonce}.wasm`,
		`/assets/__omniconvert_missing_${nonce}.js`,
		`/${core.slice(0, core.lastIndexOf("/"))}/__omniconvert_missing_${nonce}.wasm`,
		`/${wrapper.slice(0, wrapper.lastIndexOf("/"))}/__omniconvert_missing_${nonce}.js`,
		`/sources/__omniconvert_missing_${nonce}.zip`,
	];
	for (const path of missing) {
		const response = await fetchAsset(origin, path, 65536, temporaryDirectory, true);
		if (response.status !== 404) fail(`Missing asset must return status 404: ${path}`);
	}

	console.log(JSON.stringify({
		format: "omniconvert-host-verification/v1",
		origin: origin.origin,
		verifiedAt: new Date().toISOString(),
		artifactRevision: manifest.gitRevision,
		artifactTrackedDirty: manifest.trackedDirty,
		verifiedAssets: artifacts.size - 1,
		missingAssetChecks: missing.length,
		loopbackTest: ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname),
	}, null, 2));
} catch (error) {
	console.error(`Host verification failed: ${error instanceof Error ? error.message : String(error)}`);
	process.exitCode = 1;
} finally {
	if (temporaryDirectory) rmSync(temporaryDirectory, { recursive: true, force: true });
}
