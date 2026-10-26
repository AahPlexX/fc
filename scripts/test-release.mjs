import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(process.argv[2] ?? join(root, "dist"));
const releaseDir = join(root, "release-results");
const checker = join(root, "scripts/check-release.mjs");
const report = join(releaseDir, "negative-artifact-checks.json");
const require = createRequire(import.meta.url);
const JSZip = require("jszip");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const exifVersion = pkg.dependencies.exifreader;
const coreVersion = pkg.dependencies["@ffmpeg/core"];
const archiveRel = `sources/exifreader-${exifVersion}.zip`;
const archiveName = `package/src/exif-reader.js`;
const fixedDate = new Date(Date.UTC(1980, 0, 1));
const scratchRoot = mkdtempSync(join(tmpdir(), "omniconvert-release-negative-"));
const scratchDist = join(scratchRoot, "dist");
const outcomes = [];
const timezones = ["America/Los_Angeles", "Pacific/Auckland"];

function runChecker(target, timezone) {
	return spawnSync(process.execPath, [checker, target], { cwd: root, encoding: "utf8", timeout: 30_000, env: { ...process.env, ...(timezone ? { TZ: timezone } : {}) } });
}

function assertPass(target, message, timezone) {
	const result = runChecker(target, timezone);
	assert.equal(result.status, 0, `${message}\n${result.stdout}\n${result.stderr}`);
}

function collectFiles(dir, prefix = "") {
	const files = [];
	for (const name of readdirSync(dir)) {
		const path = join(dir, name);
		const stat = lstatSync(path);
		assert(!stat.isSymbolicLink(), `Unexpected symlink in artifact tree: ${path}`);
		const rel = prefix ? `${prefix}/${name}` : name;
		if (stat.isDirectory()) files.push(...collectFiles(path, rel));
		else {
			assert(stat.isFile(), `Unexpected file type in artifact tree: ${path}`);
			files.push(rel);
		}
	}
	return files;
}

async function mutateArchive(path, mutate) {
	const zip = await JSZip.loadAsync(readFileSync(path));
	await mutate(zip);
	const bytes = await zip.generateAsync({
		type: "nodebuffer",
		compression: "DEFLATE",
		compressionOptions: { level: 9 },
		platform: "UNIX",
	});
	writeFileSync(path, bytes);
}

async function main() {
	rmSync(report, { force: true });
	assert(existsSync(dist) && lstatSync(dist).isDirectory() && !lstatSync(dist).isSymbolicLink(), `Build dist first; invalid dist: ${dist}`);
	assertPass(dist, "Built dist must pass release:check before negative cases");
	for (const timezone of timezones) assertPass(dist, `Source timestamps must be timezone-independent (${timezone})`, timezone);
	const files = collectFiles(dist);
	mkdirSync(scratchRoot, { recursive: true });
	cpSync(dist, scratchDist, { recursive: true, errorOnExist: true });
	for (const path of files) {
		const source = lstatSync(join(dist, ...path.split("/")));
		const copy = lstatSync(join(scratchDist, ...path.split("/")));
		assert(source.dev !== copy.dev || source.ino !== copy.ino, `Scratch file shares an inode with dist: ${path}`);
	}
	async function rejects(name, file, mutate, expected) {
		const path = join(scratchDist, ...file.split("/"));
		const original = readFileSync(path);
		try {
			await mutate(path, original);
			const result = runChecker(scratchDist);
			assert.notEqual(result.status, 0, `${name} unexpectedly passed release:check`);
			const output = `${result.stdout}\n${result.stderr}`;
			assert(output.includes(expected), `${name} failed for the wrong reason; expected ${JSON.stringify(expected)}\n${output}`);
			assert(!existsSync(join(releaseDir, "artifact-manifest.json")), `${name} left an artifact manifest`);
			assert(!existsSync(join(releaseDir, "SHA256SUMS")), `${name} left SHA256SUMS`);
			outcomes.push({ name, expectedError: expected, passed: true });
		} finally {
			writeFileSync(path, original);
		}
	}

	const remove = async (path) => rmSync(path);
	await rejects("missing source archive", archiveRel, remove, "Missing ExifReader corresponding-source archive");
	await rejects("missing source page", "sources.html", remove, "Missing source and notices page");
	await rejects("changed source bytes", archiveRel, async (path) => mutateArchive(path, async (zip) => {
		const bytes = await zip.file(archiveName).async("nodebuffer");
		bytes[0] ^= 1;
		zip.file(archiveName, bytes, { binary: true, createFolders: false, date: fixedDate, compression: "DEFLATE", compressionOptions: { level: 9 } });
	}), "ExifReader source archive bytes differ from installed package: package/src/exif-reader.js");
	await rejects("bad archive CRC", archiveRel, async (path, bytes) => {
		const changed = Buffer.from(bytes);
		const directory = changed.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
		assert(directory >= 0, "ZIP central directory missing");
		changed[directory + 16] ^= 1;
		writeFileSync(path, changed);
	}, "ExifReader source archive CRC differs from installed file");
	await rejects("source member symlink", archiveRel, (path) => mutateArchive(path, async (zip) => {
		zip.file(archiveName).unixPermissions = 0o120777;
	}), "ExifReader source archive entry is not a regular file");
	await rejects("missing LICENSE entry", archiveRel, (path) => mutateArchive(path, async (zip) => zip.remove("package/LICENSE")), "entry list differs from installed package");
	await rejects("extra archive member", archiveRel, (path) => mutateArchive(path, async (zip) => zip.file("package/extra.txt", "extra", { createFolders: false, date: fixedDate, compression: "DEFLATE", compressionOptions: { level: 9 } })), "entry list differs from installed package");
	await rejects("wrong source link", "sources.html", async (path, bytes) => writeFileSync(path, bytes.toString("utf8").replace(`/sources/exifreader-${exifVersion}.zip`, "/sources/wrong.zip")), `dist/sources.html must link /sources/exifreader-${exifVersion}.zip`);
	await rejects("wrong source cache rule", "_headers", async (path, bytes) => {
		const changed = bytes.toString("utf8").replace(/(^\/sources\/\*\s*\n\s*Cache-Control:\s*)public,\s*max-age=31536000,\s*immutable/m, "$1no-cache");
		assert.notEqual(changed, bytes.toString("utf8"), "Could not locate source cache rule");
		writeFileSync(path, changed);
	}, "Production _headers must make versioned /sources/* archives immutable");
	await rejects("missing core JS", `engines/core/${coreVersion}/ffmpeg-core.js`, remove, "FFmpeg core asset is missing: ffmpeg-core.js");
	await rejects("tampered WASM", `engines/core/${coreVersion}/ffmpeg-core.wasm`, async (path, bytes) => {
		const changed = Buffer.from(bytes); changed[changed.length - 1] ^= 1; writeFileSync(path, changed);
	}, "FFmpeg core asset differs from installed @ffmpeg/core: ffmpeg-core.wasm");
	await rejects("unsubstituted service-worker token", "sw.js", async (path, bytes) => writeFileSync(path, Buffer.concat([bytes, Buffer.from("\n__TOKEN__")])), "dist/sw.js still contains an unsubstituted build token");
	await rejects("wildcard CSP", "_headers", async (path, bytes) => writeFileSync(path, bytes.toString("utf8").replace("script-src 'self' 'wasm-unsafe-eval'", "script-src 'self' *")), "Production CSP must set script-src 'self' 'wasm-unsafe-eval' exactly");
	await rejects("notice drift", "THIRD_PARTY_NOTICES.txt", async (path, bytes) => {
		const changed = Buffer.from(bytes); changed[0] ^= 1; writeFileSync(path, changed);
	}, "dist/THIRD_PARTY_NOTICES.txt does not byte-match public/THIRD_PARTY_NOTICES.txt");

	assert.equal(outcomes.length, 14);
}

let error;
try {
	await main();
} catch (cause) {
	error = cause;
} finally {
	rmSync(scratchRoot, { recursive: true, force: true });
	try {
		assertPass(dist, "Final release:check must restore positive evidence for the original dist");
	} catch (cause) {
		error ??= cause;
	}
}

if (error) throw error;
mkdirSync(releaseDir, { recursive: true });
writeFileSync(report, `${JSON.stringify({ format: "omniconvert-negative-artifact-checks/v1", distDirectory: relative(root, dist) || ".", passed: outcomes.length, timezoneChecks: timezones, cases: outcomes }, null, 2)}\n`);
console.log(`Release negative artifact checks passed (${outcomes.length} cases)`);
