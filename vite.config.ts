import { createHash } from "node:crypto";
import {
	existsSync,
	lstatSync,
	readFileSync,
	readdirSync,
	writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const require = createRequire(import.meta.url);

const packageDirectory = (entry: string, packageName: string): string => {
	let current = dirname(entry);
	while (current !== dirname(current)) {
		try {
			const packageJson = JSON.parse(
				readFileSync(join(current, "package.json"), "utf8"),
			) as {
				name?: string;
			};
			if (packageJson.name === packageName) return current;
		} catch {
			// Keep walking until the package root is found.
		}
		current = dirname(current);
	}
	throw new Error(`Could not locate installed package ${packageName}`);
};

const ffmpegAssetPaths = (): Array<{ fileName: string; source: string }> => {
	const coreRoot = packageDirectory(
		require.resolve("@ffmpeg/core"),
		"@ffmpeg/core",
	);
	const wrapperRoot = packageDirectory(
		require.resolve("@ffmpeg/ffmpeg/worker"),
		"@ffmpeg/ffmpeg",
	);
	const coreVersion = JSON.parse(readFileSync(join(coreRoot, "package.json"), "utf8")).version as string;
	const wrapperVersion = JSON.parse(readFileSync(join(wrapperRoot, "package.json"), "utf8")).version as string;
	const coreDirectory = join(coreRoot, "dist", "esm");
	const wrapperDirectory = join(wrapperRoot, "dist", "esm");
	const assets = [
		{
			fileName: `engines/core/${coreVersion}/ffmpeg-core.js`,
			source: join(coreDirectory, "ffmpeg-core.js"),
		},
		{
			fileName: `engines/core/${coreVersion}/ffmpeg-core.wasm`,
			source: join(coreDirectory, "ffmpeg-core.wasm"),
		},
	];

	for (const fileName of readdirSync(wrapperDirectory).filter((name) =>
		name.endsWith(".js"),
	)) {
		assets.push({
			fileName: `engines/wrapper/${wrapperVersion}/${fileName}`,
			source: join(wrapperDirectory, fileName),
		});
	}

	return assets;
};

const exifReaderSourceArchive = async (): Promise<{
	version: string;
	fileName: string;
	contents: Uint8Array;
}> => {
	const packageRoot = packageDirectory(
		require.resolve("exifreader/package.json"),
		"exifreader",
	);
	const packageMetadata = JSON.parse(
		readFileSync(join(packageRoot, "package.json"), "utf8"),
	) as { version: string };
	const version = packageMetadata.version;
	const rootStat = lstatSync(packageRoot);
	if (rootStat.isSymbolicLink() || !rootStat.isDirectory())
		throw new Error(`ExifReader package root is not a real directory: ${packageRoot}`);

	const files: Array<{ archivePath: string; sourcePath: string }> = [];
	const visit = (directory: string): void => {
		for (const name of readdirSync(directory).sort()) {
			const sourcePath = join(directory, name);
			const stat = lstatSync(sourcePath);
			if (stat.isSymbolicLink())
				throw new Error(`ExifReader package contains symlink: ${sourcePath}`);
			if (stat.isDirectory()) {
				if (name === "node_modules") continue;
				visit(sourcePath);
				continue;
			}
			if (!stat.isFile())
				throw new Error(`ExifReader package contains special file: ${sourcePath}`);
			const packagePath = relative(packageRoot, sourcePath)
				.split(sep)
				.join("/");
			files.push({
				archivePath: `package/${packagePath}`,
				sourcePath,
			});
		}
	};
	visit(packageRoot);
	files.sort((left, right) =>
		left.archivePath < right.archivePath
			? -1
			: left.archivePath > right.archivePath
				? 1
				: 0,
	);

	const JSZip = require("jszip") as typeof import("jszip");
	const zip = new JSZip();
	const fixedTimestamp = new Date("1980-01-01T00:00:00.000Z");
	for (const file of files) {
		zip.file(file.archivePath, readFileSync(file.sourcePath), {
			date: fixedTimestamp,
			createFolders: false,
			compression: "DEFLATE",
			compressionOptions: { level: 9 },
		});
	}
	return {
		version,
		fileName: `sources/exifreader-${version}.zip`,
		contents: await zip.generateAsync({
			type: "uint8array",
			compression: "DEFLATE",
			compressionOptions: { level: 9 },
			platform: "DOS",
		}),
	};
};

const sourcesIndex = (exifReaderVersion: string): string => `<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>OmniConvert source materials</title>
	<style>
		:root { color-scheme: dark; font-family: system-ui, sans-serif; background: #10131b; color: #f4f6fa; }
		* { box-sizing: border-box; }
		body { margin: 0; line-height: 1.6; }
		main { width: min(100% - 2rem, 48rem); margin-inline: auto; padding-block: clamp(2rem, 8vw, 5rem); }
		h1 { line-height: 1.2; }
		li { margin-block: .5rem; }
		a { display: inline-flex; align-items: center; min-height: 44px; padding: .5rem .75rem; color: #a9d2ff; overflow-wrap: anywhere; }
		a:focus-visible { outline: 3px solid #ffdf80; outline-offset: 3px; border-radius: .25rem; }
		code { overflow-wrap: anywhere; }
	</style>
</head>
<body>
	<main>
		<h1>OmniConvert source materials</h1>
		<p>These materials describe third-party components included with this static application.</p>
		<ul>
			<li><a href="/THIRD_PARTY_NOTICES.txt">Third-party notices and license texts</a></li>
			<li><a href="/sources/exifreader-${exifReaderVersion}.zip" download>ExifReader ${exifReaderVersion} package source archive</a></li>
		</ul>
		<p>The archive contains the unmodified regular files from the installed ExifReader ${exifReaderVersion} package, under a <code>package/</code> directory. ExifReader is distributed under MPL-2.0; see its included license and the notices above.</p>
		<p>The FFmpeg source correspondence remains <strong>UNVERIFIED</strong>. The upstream <a href="https://github.com/ffmpegwasm/ffmpeg.wasm/commit/71aa99d37c02a7b4c435275ca9ef50e612f6efa1">71aa99d</a> commit is a candidate release source, not verification that it produced the distributed WASM.</p>
	</main>
</body>
</html>
`;

const csp = (development: boolean): string =>
	[
		"default-src 'self'",
		`script-src 'self' 'wasm-unsafe-eval'${development ? " 'unsafe-eval'" : ""}`,
		"style-src 'self' 'unsafe-inline'",
		"img-src 'self' data: blob:",
		"font-src 'self' data:",
		`connect-src 'self'${development ? " ws: wss:" : ""}`,
		"worker-src 'self' blob:",
		"media-src 'self' blob:",
		"object-src 'none'",
		"form-action 'none'",
		"base-uri 'none'",
		"frame-ancestors 'none'",
	].join("; ");

const securityHeaders = (development: boolean): Record<string, string> => ({
	"Content-Security-Policy": csp(development),
	"X-Content-Type-Options": "nosniff",
	"Referrer-Policy": "no-referrer",
	"Permissions-Policy": "camera=(), microphone=(), geolocation=()",
});

const noCachePath = (pathname: string): boolean =>
	pathname === "/" ||
	pathname === "/index.html" ||
	pathname === "/sw.js" ||
	pathname === "/manifest.webmanifest" ||
	pathname === "/icon.svg" ||
	pathname === "/sources.html" ||
	pathname === "/THIRD_PARTY_NOTICES.txt" ||
	pathname.startsWith("/engines/");

const cacheControl = (pathname: string): string | null =>
	noCachePath(pathname)
		? "no-cache"
		: pathname.startsWith("/assets/") || pathname.startsWith("/sources/")
			? "public, max-age=31536000, immutable"
			: null;

const generatedHeaders = (): string =>
	[
		"/*",
		...Object.entries(securityHeaders(false)).map(
			([name, value]) => `  ${name}: ${value}`,
		),
		...[
			"/",
			"/index.html",
			"/sw.js",
			"/manifest.webmanifest",
			"/icon.svg",
			"/sources.html",
			"/THIRD_PARTY_NOTICES.txt",
			"/engines/*",
		].flatMap((path) => [path, "  Cache-Control: no-cache"]),
		"/assets/*",
		"  Cache-Control: public, max-age=31536000, immutable",
		"/sources/*",
		"  Cache-Control: public, max-age=31536000, immutable",
		"",
	].join("\n");

const ffmpegAssetsPlugin = (): Plugin => {
	let cacheVersion: string | null = null;
	const publicDirectory = join(
		dirname(fileURLToPath(import.meta.url)),
		"public",
	);

	return {
		name: "omniconvert-ffmpeg-assets",
		configureServer(server) {
			const assets = ffmpegAssetPaths();
			server.middlewares.use((request, response, next) => {
				const pathname = new URL(request.url ?? "/", "http://localhost")
					.pathname;
				if (request.method !== "GET" && request.method !== "HEAD")
					return next();
				if (!pathname.startsWith("/engines/")) return next();

				const asset = assets.find(
					({ fileName }) => pathname === `/${fileName}`,
				);
				if (!asset) return next();
				const buffer = readFileSync(asset.source);
				response.statusCode = 200;
				response.setHeader(
					"Content-Type",
					asset.fileName.endsWith(".wasm")
						? "application/wasm"
						: "text/javascript; charset=utf-8",
				);
				response.setHeader("Cache-Control", "no-cache");
				response.setHeader("Content-Length", buffer.length);
				response.end(request.method === "HEAD" ? undefined : buffer);
			});
			server.middlewares.use((_request, response, next) => {
				for (const [name, value] of Object.entries(securityHeaders(true)))
					response.setHeader(name, value);
				next();
			});
		},
		configurePreviewServer(server) {
			const outputRoot = resolve(server.config.root, server.config.build.outDir);
			server.middlewares.use((request, response, next) => {
				for (const [name, value] of Object.entries(securityHeaders(false)))
					response.setHeader(name, value);
				let pathname: string;
				try {
					pathname = decodeURIComponent(
						new URL(request.url ?? "/", "http://localhost").pathname,
					);
				} catch {
					response.statusCode = 400;
					response.end();
					return;
				}
				const policy = cacheControl(pathname);
				if (policy) response.setHeader("Cache-Control", policy);
				const assetPath = /^\/(?:assets|engines|sources)\//.test(pathname) ||
					/\.[^/]+$/.test(pathname);
				if ((request.method === "GET" || request.method === "HEAD") && assetPath) {
					const candidate = resolve(outputRoot, `.${pathname}`);
					if (!candidate.startsWith(outputRoot + sep) || !existsSync(candidate)) {
						response.statusCode = 404;
						response.setHeader("Cache-Control", "no-store");
						response.end();
						return;
					}
				}
				next();
			});
		},
		async generateBundle(_options, bundle) {
			const engineAssets = ffmpegAssetPaths();
			const exifReaderArchive = await exifReaderSourceArchive();
			for (const asset of engineAssets) {
				this.emitFile({
					type: "asset",
					fileName: asset.fileName,
					source: readFileSync(asset.source),
				});
			}
			this.emitFile({
				type: "asset",
				fileName: "_headers",
				source: generatedHeaders(),
			});
			this.emitFile({
				type: "asset",
				fileName: exifReaderArchive.fileName,
				source: exifReaderArchive.contents,
			});
			this.emitFile({
				type: "asset",
				fileName: "sources.html",
				source: sourcesIndex(exifReaderArchive.version),
			});
			const hash = createHash("sha256");
			const addToHash = (
				fileName: string,
				source: string | Uint8Array,
			): void => {
				hash.update(fileName).update("\0").update(source).update("\0");
			};
			for (const output of Object.values(bundle).sort((left, right) =>
				left.fileName.localeCompare(right.fileName),
			)) {
				addToHash(
					output.fileName,
					output.type === "chunk" ? output.code : output.source,
				);
			}
			for (const asset of engineAssets)
				addToHash(asset.fileName, readFileSync(asset.source));
			for (const fileName of ["manifest.webmanifest", "icon.svg", "sw.js"]) {
				addToHash(fileName, readFileSync(join(publicDirectory, fileName)));
			}
			cacheVersion = hash.digest("hex").slice(0, 16);
		},
		writeBundle(outputOptions, bundle) {
			if (!outputOptions.dir) return;
			const chunks = Object.values(bundle).filter(
				(item) => item.type === "chunk",
			);
			const byFileName = new Map(
				chunks.map((chunk) => [chunk.fileName, chunk]),
			);
			const shellFiles = new Set<string>([
				"/",
				"/manifest.webmanifest",
				"/icon.svg",
			]);
			const visit = (fileName: string): void => {
				if (shellFiles.has(`/${fileName}`)) return;
				const chunk = byFileName.get(fileName);
				if (!chunk) return;
				shellFiles.add(`/${fileName}`);
				for (const imported of chunk.imports) visit(imported);
				for (const cssFile of chunk.viteMetadata?.importedCss ?? [])
					shellFiles.add(`/${cssFile}`);
			};
			for (const chunk of chunks) if (chunk.isEntry) visit(chunk.fileName);

			const serviceWorkerPath = resolve(outputOptions.dir, "sw.js");
			if (!cacheVersion) throw new Error("PWA cache version was not generated");
			const source = readFileSync(serviceWorkerPath, "utf8")
				.replace("__PRECACHE_ASSETS__", JSON.stringify([...shellFiles]))
				.replace("__CACHE_VERSION__", cacheVersion);
			writeFileSync(serviceWorkerPath, source);
		},
	};
};

export default defineConfig({
	plugins: [react(), ffmpegAssetsPlugin()],
	build: {
		target: "es2022",
	},
	worker: {
		format: "es",
	},
});
