import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import {
	createZipArchive,
	DEFAULT_ZIP_LIMITS,
	extractZipArchive,
	resolveFilenameCollisions,
	sanitizeOutputFilename,
} from "../../src/core/exportFiles";

const toBytes = async (blob: Blob): Promise<Uint8Array> =>
	new Uint8Array(await blob.arrayBuffer());

const renameZipEntry = async (
	zipBlob: Blob,
	oldName: string,
	newName: string,
): Promise<Uint8Array> => {
	const bytes = await toBytes(zipBlob);
	const oldBytes = new TextEncoder().encode(oldName);
	const newBytes = new TextEncoder().encode(newName);
	expect(oldBytes.byteLength).toBe(newBytes.byteLength);
	let matches = 0;
	for (let offset = 0; offset <= bytes.length - oldBytes.length; offset += 1) {
		if (oldBytes.every((byte, index) => bytes[offset + index] === byte)) {
			bytes.set(newBytes, offset);
			matches += 1;
		}
	}
	expect(matches).toBeGreaterThanOrEqual(2);
	return bytes;
};

const inflateDeclaredSize = (bytes: Uint8Array, size: number): Uint8Array => {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	for (let offset = 0; offset <= bytes.length - 46; offset += 1) {
		if (view.getUint32(offset, true) === 0x02014b50) {
			view.setUint32(offset + 24, size, true);
			return bytes;
		}
	}
	throw new Error("ZIP central directory fixture missing");
};

const setCentralField = (
	bytes: Uint8Array,
	fieldOffset: number,
	value: number,
): Uint8Array => {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	for (let offset = 0; offset <= bytes.length - 46; offset += 1) {
		if (view.getUint32(offset, true) === 0x02014b50) {
			view.setUint32(offset + fieldOffset, value, true);
			return bytes;
		}
	}
	throw new Error("ZIP central directory fixture missing");
};

describe("Phase 12 export/archive contracts", () => {
	it("sanitizes filenames and resolves case-insensitive collisions deterministically", () => {
		expect(sanitizeOutputFilename("../../bad:name?.txt")).toBe("bad_name_.txt");
		expect(
			resolveFilenameCollisions(["result.txt", "RESULT.txt", "result (2).txt"]),
		).toEqual(["result.txt", "RESULT (2).txt", "result (2) (2).txt"]);
	});

	it("creates a ZIP with safe unique names and extracts its entries", async () => {
		const archive = await createZipArchive([
			{ filename: "same.txt", blob: new Blob(["one"]) },
			{ filename: "SAME.txt", blob: new Blob(["two"]) },
		]);
		const entries = await extractZipArchive(await toBytes(archive));
		expect(entries.map((entry) => entry.filename)).toEqual([
			"same.txt",
			"SAME (2).txt",
		]);
		expect(await entries[0]?.blob.text()).toBe("one");
		expect(await entries[1]?.blob.text()).toBe("two");
	});

	it("bounds ZIP export entry, input, and generated archive sizes", async () => {
		const file = { filename: "a.txt", blob: new Blob(["payload"]) };
		await expect(
			createZipArchive([file], { ...DEFAULT_ZIP_LIMITS, maxEntries: 0 }),
		).rejects.toThrow(/entry limit/i);
		await expect(
			createZipArchive([file], { ...DEFAULT_ZIP_LIMITS, maxTotalBytes: 1 }),
		).rejects.toThrow(/total size limit/i);
		await expect(
			createZipArchive([file], { ...DEFAULT_ZIP_LIMITS, maxArchiveBytes: 1 }),
		).rejects.toThrow(/output limit/i);
	});

	it("rejects traversal paths before extracting content", async () => {
		const zip = new JSZip();
		zip.file("safe.txt", "payload");
		const bytes = await renameZipEntry(
			await zip.generateAsync({ type: "blob" }),
			"safe.txt",
			"../x.txt",
		);
		await expect(extractZipArchive(bytes)).rejects.toThrow(
			/unsafe|path|traversal/i,
		);
	});

	it("rejects nested ZIP entries", async () => {
		const zip = new JSZip();
		zip.file("nested.zip", new Uint8Array([0x50, 0x4b, 0x03, 0x04]));
		const bytes = new Uint8Array(
			await (await zip.generateAsync({ type: "blob" })).arrayBuffer(),
		);
		await expect(extractZipArchive(bytes)).rejects.toThrow(/nested/i);
	});

	it("checks entry count and declared expansion before JSZip extraction", async () => {
		const zip = new JSZip();
		zip.file("small.txt", "x");
		const bytes = new Uint8Array(
			await (await zip.generateAsync({ type: "blob" })).arrayBuffer(),
		);
		await expect(
			extractZipArchive(bytes, { ...DEFAULT_ZIP_LIMITS, maxEntries: 0 }),
		).rejects.toThrow(/entry limit/i);
		await expect(
			extractZipArchive(inflateDeclaredSize(bytes, 1000)),
		).rejects.toThrow(/compression ratio/i);
	});

	it("aborts streamed inflation when actual bytes exceed a forged declared size", async () => {
		const zip = new JSZip();
		zip.file("small.txt", "x".repeat(32 * 1024));
		const bytes = new Uint8Array(
			await (await zip.generateAsync({ type: "blob" })).arrayBuffer(),
		);
		await expect(
			extractZipArchive(inflateDeclaredSize(bytes, 1)),
		).rejects.toThrow(/exceeded its declared size/i);
	});

	it("checks CRC after bounded streaming extraction", async () => {
		const zip = new JSZip();
		zip.file("small.txt", "payload");
		const bytes = new Uint8Array(
			await (await zip.generateAsync({ type: "blob" })).arrayBuffer(),
		);
		await expect(
			extractZipArchive(setCentralField(bytes, 16, 0)),
		).rejects.toThrow(/CRC mismatch/i);
	});
});
