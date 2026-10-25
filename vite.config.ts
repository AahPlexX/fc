import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
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
	const coreDirectory = join(coreRoot, "dist", "esm");
	const wrapperDirectory = join(wrapperRoot, "dist", "esm");
	const assets = [
		{
			fileName: "engines/ffmpeg-core.js",
			source: join(coreDirectory, "ffmpeg-core.js"),
		},
		{
			fileName: "engines/ffmpeg-core.wasm",
			source: join(coreDirectory, "ffmpeg-core.wasm"),
		},
	];

	for (const fileName of readdirSync(wrapperDirectory).filter((name) =>
		name.endsWith(".js"),
	)) {
		assets.push({
			fileName: `engines/ffmpeg/${fileName}`,
			source: join(wrapperDirectory, fileName),
		});
	}

	return assets;
};

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
		"base-uri 'self'",
		"frame-ancestors 'none'",
	].join("; ");

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
				response.setHeader("Content-Security-Policy", csp(true));
				next();
			});
		},
		configurePreviewServer(server) {
			server.middlewares.use((_request, response, next) => {
				response.setHeader("Content-Security-Policy", csp(false));
				next();
			});
		},
		generateBundle(_options, bundle) {
			const engineAssets = ffmpegAssetPaths();
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
				source: `/*\n  Content-Security-Policy: ${csp(false)}\n`,
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
