import type JSZip from "jszip";

export interface ExportFile {
	readonly filename: string;
	readonly blob: Blob;
}

export interface ExtractedArchiveEntry extends ExportFile {}

export interface ZipLimits {
	readonly maxArchiveBytes: number;
	readonly maxEntries: number;
	readonly maxEntryBytes: number;
	readonly maxTotalBytes: number;
	readonly maxCompressionRatio: number;
}

export const DEFAULT_ZIP_LIMITS: ZipLimits = {
	maxArchiveBytes: 256 * 1024 * 1024,
	maxEntries: 1000,
	maxEntryBytes: 256 * 1024 * 1024,
	maxTotalBytes: 256 * 1024 * 1024,
	maxCompressionRatio: 100,
};

const utf8 = new TextDecoder("utf-8", { fatal: true });
const ZIP_SIGNATURE = 0x04034b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const EOCD_SIGNATURE = 0x06054b50;
const EOCD_MIN_BYTES = 22;
const EOCD_MAX_BYTES = EOCD_MIN_BYTES + 0xffff;
const crc32Table = Uint32Array.from({ length: 256 }, (_, value) => {
	let crc = value;
	for (let bit = 0; bit < 8; bit += 1) {
		crc = (crc & 1) === 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
	}
	return crc >>> 0;
});

const basename = (value: string): string => value.split(/[\\/]/).at(-1) ?? "";

export const sanitizeOutputFilename = (
	filename: string,
	fallback = "download",
): string => {
	const leaf = basename(filename).normalize("NFKC");
	const safe = Array.from(leaf, (character) => {
		const code = character.charCodeAt(0);
		return code < 32 || code === 127 ? "_" : character;
	})
		.join("")
		.replace(/[<>:"|?*]/g, "_")
		.replace(/[. ]+$/g, "")
		.trim();
	if (!safe || safe === "." || safe === "..") {
		return fallback;
	}
	return safe.slice(0, 180);
};

export const resolveFilenameCollisions = (
	filenames: readonly string[],
): string[] => {
	const reserved = new Set<string>();
	return filenames.map((rawFilename) => {
		const filename = sanitizeOutputFilename(rawFilename);
		const dot = filename.lastIndexOf(".");
		const stem = dot > 0 ? filename.slice(0, dot) : filename;
		const extension = dot > 0 ? filename.slice(dot) : "";
		let candidate = filename;
		let suffix = 2;
		while (reserved.has(candidate.toLocaleLowerCase("en-US"))) {
			candidate = `${stem} (${suffix})${extension}`;
			suffix += 1;
		}
		reserved.add(candidate.toLocaleLowerCase("en-US"));
		return candidate;
	});
};

export const downloadBlob = (blob: Blob, filename: string): void => {
	if (typeof document === "undefined" || typeof URL === "undefined") {
		throw new Error("Downloads are only available in a browser window");
	}
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = sanitizeOutputFilename(filename);
	anchor.hidden = true;
	document.body.append(anchor);
	try {
		anchor.click();
	} finally {
		anchor.remove();
		window.setTimeout(() => URL.revokeObjectURL(url), 1000);
	}
};

export const createZipArchive = async (
	files: readonly ExportFile[],
	limits: ZipLimits = DEFAULT_ZIP_LIMITS,
): Promise<Blob> => {
	if (files.length === 0) {
		throw new Error("Cannot create an empty ZIP archive");
	}
	if (files.length > limits.maxEntries) {
		throw new Error("ZIP archive exceeds the entry limit");
	}
	const inputBytes = files.reduce((total, file) => total + file.blob.size, 0);
	if (files.some((file) => file.blob.size > limits.maxEntryBytes)) {
		throw new Error("ZIP entry exceeds the configured size limit");
	}
	if (inputBytes > limits.maxTotalBytes) {
		throw new Error("ZIP contents exceed the configured total size limit");
	}
	const { default: JSZip } = await import("jszip");
	const zip = new JSZip();
	const filenames = resolveFilenameCollisions(
		files.map((file) => file.filename),
	);
	files.forEach((file, index) => {
		zip.file(filenames[index] as string, file.blob);
	});
	const stream = zip.generateInternalStream({
		type: "uint8array",
		compression: "DEFLATE",
		compressionOptions: { level: 6 },
	});
	const chunks: ArrayBuffer[] = [];
	let outputBytes = 0;
	const output = await new Promise<ArrayBuffer[]>((resolve, reject) => {
		let settled = false;
		const fail = (error: Error): void => {
			if (settled) return;
			settled = true;
			stream.pause();
			reject(error);
		};
		stream
			.on("data", (chunk) => {
				outputBytes += chunk.byteLength;
				if (outputBytes > limits.maxArchiveBytes) {
					fail(
						new Error(
							"Generated ZIP archive exceeds the configured output limit",
						),
					);
					return;
				}
				chunks.push(chunk.slice().buffer as ArrayBuffer);
			})
			.on("error", fail)
			.on("end", () => {
				if (!settled) {
					settled = true;
					resolve(chunks);
				}
			})
			.resume();
	});
	return new Blob(output, { type: "application/zip" });
};

interface CentralEntry {
	readonly filename: string;
	readonly compressedSize: number;
	readonly crc32: number;
	readonly uncompressedSize: number;
	readonly method: number;
	readonly flags: number;
	readonly localOffset: number;
	readonly externalAttributes: number;
	readonly directory: boolean;
}

const readU16 = (view: DataView, offset: number): number =>
	view.getUint16(offset, true);
const readU32 = (view: DataView, offset: number): number =>
	view.getUint32(offset, true);

const decodeZipName = (bytes: Uint8Array, flags: number): string => {
	if ((flags & 0x0800) === 0 && bytes.some((byte) => byte >= 0x80)) {
		throw new Error("ZIP entry uses an unsupported non-UTF-8 filename");
	}
	try {
		return utf8.decode(bytes);
	} catch {
		throw new Error("ZIP entry filename is not valid UTF-8");
	}
};

const validateEntryPath = (filename: string): void => {
	if (
		!filename ||
		filename.startsWith("/") ||
		filename.startsWith("\\") ||
		/^[a-z]:/i.test(filename) ||
		filename.includes("\\") ||
		filename.includes("\u0000") ||
		filename.split("/").some((part) => part === ".." || part === ".")
	) {
		throw new Error(`Unsafe ZIP entry path: ${filename}`);
	}
	if (/\.(zip|zipx)$/i.test(filename)) {
		throw new Error(`Nested ZIP archives are not supported: ${filename}`);
	}
};

const findEndRecord = (bytes: Uint8Array, view: DataView): number => {
	const start = Math.max(0, bytes.length - EOCD_MAX_BYTES);
	for (
		let offset = bytes.length - EOCD_MIN_BYTES;
		offset >= start;
		offset -= 1
	) {
		if (readU32(view, offset) !== EOCD_SIGNATURE) continue;
		const commentLength = readU16(view, offset + 20);
		if (offset + EOCD_MIN_BYTES + commentLength === bytes.length) return offset;
	}
	throw new Error("Invalid ZIP archive: end record is missing");
};

const inspectCentralDirectory = (
	bytes: Uint8Array,
	limits: ZipLimits,
): CentralEntry[] => {
	if (bytes.byteLength > limits.maxArchiveBytes)
		throw new Error("ZIP archive exceeds the 256 MiB input limit");
	if (bytes.byteLength < EOCD_MIN_BYTES)
		throw new Error("Invalid ZIP archive: truncated input");
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const eocd = findEndRecord(bytes, view);
	const disk = readU16(view, eocd + 4);
	const centralDisk = readU16(view, eocd + 6);
	const entriesOnDisk = readU16(view, eocd + 8);
	const entryCount = readU16(view, eocd + 10);
	const centralSize = readU32(view, eocd + 12);
	const centralOffset = readU32(view, eocd + 16);

	if (disk !== 0 || centralDisk !== 0 || entriesOnDisk !== entryCount) {
		throw new Error("Multi-disk ZIP archives are not supported");
	}
	if (
		entryCount === 0xffff ||
		centralSize === 0xffffffff ||
		centralOffset === 0xffffffff
	) {
		throw new Error("ZIP64 archives are not supported");
	}
	if (entryCount > limits.maxEntries)
		throw new Error("ZIP archive exceeds the 1,000 entry limit");
	if (
		centralOffset + centralSize > eocd ||
		centralOffset + centralSize < centralOffset
	) {
		throw new Error(
			"Invalid ZIP archive: central directory bounds are invalid",
		);
	}

	const entries: CentralEntry[] = [];
	const paths = new Set<string>();
	let offset = centralOffset;
	let totalUncompressed = 0;
	for (let index = 0; index < entryCount; index += 1) {
		if (
			offset + 46 > centralOffset + centralSize ||
			readU32(view, offset) !== CENTRAL_SIGNATURE
		) {
			throw new Error("Invalid ZIP archive: malformed central directory entry");
		}
		const flags = readU16(view, offset + 8);
		const method = readU16(view, offset + 10);
		const crc32 = readU32(view, offset + 16);
		const compressedSize = readU32(view, offset + 20);
		const uncompressedSize = readU32(view, offset + 24);
		const nameLength = readU16(view, offset + 28);
		const extraLength = readU16(view, offset + 30);
		const commentLength = readU16(view, offset + 32);
		const startDisk = readU16(view, offset + 34);
		const externalAttributes = readU32(view, offset + 38);
		const localOffset = readU32(view, offset + 42);
		const recordEnd = offset + 46 + nameLength + extraLength + commentLength;
		if (recordEnd > centralOffset + centralSize || startDisk !== 0) {
			throw new Error(
				"Invalid ZIP archive: central directory entry exceeds its bounds",
			);
		}
		if ((flags & 0x0001) !== 0 || (flags & 0x0040) !== 0)
			throw new Error("Encrypted ZIP entries are not supported");
		if (method !== 0 && method !== 8)
			throw new Error("ZIP compression method is not supported");
		if (
			compressedSize === 0xffffffff ||
			uncompressedSize === 0xffffffff ||
			localOffset === 0xffffffff
		) {
			throw new Error("ZIP64 archives are not supported");
		}
		const filename = decodeZipName(
			bytes.subarray(offset + 46, offset + 46 + nameLength),
			flags,
		);
		validateEntryPath(filename);
		const normalizedPath = filename.toLocaleLowerCase("en-US");
		if (paths.has(normalizedPath))
			throw new Error(`Duplicate ZIP entry path: ${filename}`);
		paths.add(normalizedPath);
		const unixMode = externalAttributes >>> 16;
		if ((unixMode & 0xf000) === 0xa000)
			throw new Error("Symbolic links are not supported in ZIP archives");
		const directory = filename.endsWith("/");
		if (!directory) {
			if (uncompressedSize > limits.maxEntryBytes)
				throw new Error("ZIP entry exceeds the 256 MiB limit");
			if (
				uncompressedSize > 0 &&
				(compressedSize === 0 ||
					uncompressedSize / compressedSize > limits.maxCompressionRatio)
			) {
				throw new Error("ZIP entry exceeds the 100:1 compression ratio limit");
			}
			totalUncompressed += uncompressedSize;
			if (totalUncompressed > limits.maxTotalBytes)
				throw new Error("ZIP contents exceed the 256 MiB total limit");
		}

		if (
			localOffset + 30 > centralOffset ||
			readU32(view, localOffset) !== ZIP_SIGNATURE
		) {
			throw new Error(
				"Invalid ZIP archive: local file header is out of bounds",
			);
		}
		const localFlags = readU16(view, localOffset + 6);
		const localMethod = readU16(view, localOffset + 8);
		const localNameLength = readU16(view, localOffset + 26);
		const localExtraLength = readU16(view, localOffset + 28);
		const dataStart = localOffset + 30 + localNameLength + localExtraLength;
		if (
			localFlags !== flags ||
			localMethod !== method ||
			dataStart + compressedSize > centralOffset
		) {
			throw new Error(
				"Invalid ZIP archive: local and central directory entries disagree",
			);
		}
		const localName = decodeZipName(
			bytes.subarray(localOffset + 30, localOffset + 30 + localNameLength),
			flags,
		);
		if (localName !== filename)
			throw new Error("Invalid ZIP archive: entry names disagree");

		entries.push({
			filename,
			compressedSize,
			crc32,
			uncompressedSize,
			method,
			flags,
			localOffset,
			externalAttributes,
			directory,
		});
		offset = recordEnd;
	}
	if (offset !== centralOffset + centralSize)
		throw new Error("Invalid ZIP archive: central directory size mismatch");
	return entries;
};

export const extractZipArchive = async (
	source: Uint8Array | Blob,
	limits: ZipLimits = DEFAULT_ZIP_LIMITS,
): Promise<ExtractedArchiveEntry[]> => {
	if (source instanceof Blob && source.size > limits.maxArchiveBytes) {
		throw new Error("ZIP archive exceeds the 256 MiB input limit");
	}
	const bytes =
		source instanceof Uint8Array
			? source
			: new Uint8Array(await source.arrayBuffer());
	const manifest = inspectCentralDirectory(bytes, limits);
	const { default: JSZip } = await import("jszip");
	const zip = await JSZip.loadAsync(bytes, {
		checkCRC32: false,
		createFolders: false,
	});
	const files: ExtractedArchiveEntry[] = [];
	let totalActualBytes = 0;
	for (const entry of manifest) {
		if (entry.directory) continue;
		const zipEntry = zip.file(entry.filename);
		if (!zipEntry)
			throw new Error(`ZIP entry could not be loaded: ${entry.filename}`);
		const stream = (
			zipEntry as JSZip.JSZipObject & {
				internalStream: (
					type: "uint8array",
				) => JSZip.JSZipStreamHelper<Uint8Array>;
			}
		).internalStream("uint8array");
		const chunks: ArrayBuffer[] = [];
		let actualEntryBytes = 0;
		let crc = 0xffffffff;
		const entryBytes = await new Promise<ArrayBuffer[]>((resolve, reject) => {
			let settled = false;
			const fail = (error: Error): void => {
				if (settled) return;
				settled = true;
				stream.pause();
				reject(error);
			};
			stream
				.on("data", (chunk) => {
					actualEntryBytes += chunk.byteLength;
					totalActualBytes += chunk.byteLength;
					if (actualEntryBytes > entry.uncompressedSize) {
						fail(
							new Error(
								`ZIP entry exceeded its declared size: ${entry.filename}`,
							),
						);
						return;
					}
					if (actualEntryBytes > limits.maxEntryBytes) {
						fail(
							new Error(
								`ZIP entry exceeds the configured size limit: ${entry.filename}`,
							),
						);
						return;
					}
					if (totalActualBytes > limits.maxTotalBytes) {
						fail(
							new Error("ZIP contents exceed the configured total size limit"),
						);
						return;
					}
					if (
						actualEntryBytes > 0 &&
						(entry.compressedSize === 0 ||
							actualEntryBytes / entry.compressedSize >
								limits.maxCompressionRatio)
					) {
						fail(
							new Error(
								`ZIP entry exceeds the configured compression ratio: ${entry.filename}`,
							),
						);
						return;
					}
					for (const byte of chunk) {
						crc = (crc >>> 8) ^ (crc32Table[(crc ^ byte) & 0xff] ?? 0);
					}
					chunks.push(chunk.slice().buffer as ArrayBuffer);
				})
				.on("error", fail)
				.on("end", () => {
					if (settled) return;
					if (actualEntryBytes !== entry.uncompressedSize) {
						fail(new Error(`ZIP entry size mismatch: ${entry.filename}`));
						return;
					}
					if ((crc ^ 0xffffffff) >>> 0 !== entry.crc32) {
						fail(new Error(`ZIP entry CRC mismatch: ${entry.filename}`));
						return;
					}
					settled = true;
					resolve(chunks);
				})
				.resume();
		});
		const blob = new Blob(entryBytes);
		const prefix = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
		if (
			prefix[0] === 0x50 &&
			prefix[1] === 0x4b &&
			[0x03, 0x05, 0x07].includes(prefix[2] ?? -1)
		) {
			throw new Error(
				`Nested ZIP archives are not supported: ${entry.filename}`,
			);
		}
		files.push({ filename: entry.filename, blob });
	}
	return files;
};

export type ExportWorkerRequest =
	| {
			readonly type: "zip-export";
			readonly jobId: string;
			readonly files: readonly ExportFile[];
	  }
	| {
			readonly type: "zip-import";
			readonly jobId: string;
			readonly bytes: Uint8Array;
	  }
	| {
			readonly type: "zip-import";
			readonly jobId: string;
			readonly file: Blob;
	  };

export type ExportWorkerResponse =
	| {
			readonly type: "zip-export-result";
			readonly jobId: string;
			readonly blob: Blob;
	  }
	| {
			readonly type: "zip-import-result";
			readonly jobId: string;
			readonly entries: readonly ExtractedArchiveEntry[];
	  }
	| {
			readonly type: "error";
			readonly jobId: string;
			readonly message: string;
	  };

const isDedicatedWorkerScope = (): boolean =>
	typeof WorkerGlobalScope !== "undefined" &&
	globalThis instanceof WorkerGlobalScope;

if (isDedicatedWorkerScope()) {
	const scope = globalThis as unknown as DedicatedWorkerGlobalScope;
	scope.addEventListener(
		"message",
		(event: MessageEvent<ExportWorkerRequest>) => {
			const request = event.data;
			void (async (): Promise<ExportWorkerResponse> => {
				if (request.type === "zip-export") {
					return {
						type: "zip-export-result",
						jobId: request.jobId,
						blob: await createZipArchive(request.files),
					};
				}
				return {
					type: "zip-import-result",
					jobId: request.jobId,
					entries: await extractZipArchive(
						"file" in request ? request.file : request.bytes,
					),
				};
			})()
				.then((response) => scope.postMessage(response))
				.catch((error: unknown) => {
					scope.postMessage({
						type: "error",
						jobId: request.jobId,
						message:
							error instanceof Error
								? error.message
								: "Archive operation failed",
					} satisfies ExportWorkerResponse);
				});
		},
	);
}
