import { describe, expect, it } from "vitest";
import { detectTextFormat } from "../../src/core/magicBytes";
import {
	convertTabular,
	convertTabularBlob,
	parseTabular,
	renderTabular,
} from "../../src/workers/tabular.worker";
import {
	PLAIN_PROSE,
	SAMPLE_CSV,
	SAMPLE_JSON,
	SAMPLE_TSV,
} from "../fixtures/tabular";

const encode = (text: string) => new TextEncoder().encode(text);

describe("Phase 8 tabular worker contracts", () => {
	it("detects structured UTF-8 tabular content without extension or MIME guessing", () => {
		expect(detectTextFormat(encode(SAMPLE_CSV))?.format).toBe("csv");
		expect(detectTextFormat(encode(SAMPLE_TSV))?.format).toBe("tsv");
		expect(detectTextFormat(encode(SAMPLE_JSON))?.format).toBe("json");
		expect(detectTextFormat(encode(PLAIN_PROSE))).toBeNull();
	});

	it("parses quoted CSV cells into a canonical table", async () => {
		await expect(parseTabular(SAMPLE_CSV, "csv")).resolves.toEqual({
			columns: ["name", "note", "amount"],
			rows: [
				["Alice", "Hello, world", "42"],
				["Bob", "=SUM(1,2)", "7"],
			],
		});
	});

	it("renders safe delimited exports with spreadsheet formula escaping", async () => {
		const table = await parseTabular(SAMPLE_CSV, "csv");
		const csv = await renderTabular(table, "csv");
		expect(csv).toContain("'=SUM(1,2)");
	});

	it("round-trips object JSON and escapes Markdown/HTML output", async () => {
		const table = await parseTabular(SAMPLE_JSON, "json");
		const json = await renderTabular(table, "json");
		expect(JSON.parse(json)).toEqual(JSON.parse(SAMPLE_JSON));

		const markdown = await renderTabular(table, "md");
		expect(markdown).toContain("\\|pipe");

		const html = await convertTabular(SAMPLE_JSON, "json", "html");
		expect(html).toContain("A&amp;B");
		expect(html).toContain("&lt;admin&gt;|pipe");
		expect(html).not.toContain("<admin>");
	});

	it("parses escaped Markdown tables, alignment rows, and rendered line breaks", async () => {
		const source =
			"| name | note |\n| :--- | ---: |\n| A\\|B | first<br>second |\n| C\\\\D | &lt;tag&gt; |";
		await expect(parseTabular(source, "md")).resolves.toEqual({
			columns: ["name", "note"],
			rows: [
				["A|B", "first\nsecond"],
				["C\\D", "<tag>"],
			],
		});
	});

	it("round-trips rendered Markdown data while keeping HTML literals inert", async () => {
		const table = await parseTabular(SAMPLE_JSON, "json");
		const markdown = await renderTabular(table, "md");
		expect(markdown).toContain("&lt;admin&gt;");
		await expect(parseTabular(markdown, "md")).resolves.toEqual({
			columns: table.columns,
			rows: table.rows.map((row) => row.map((value) => String(value ?? ""))),
		});

		const html = await renderTabular(table, "html");
		expect(html).toContain("<!doctype html>");
		expect(html).toContain("<style>");
		expect(html).toContain("&lt;admin&gt;|pipe");
		expect(html).not.toContain("<admin>");
	});

	it("rejects malformed Markdown rows with inconsistent column counts", async () => {
		await expect(
			parseTabular("| a | b |\n| --- | --- |\n| only one |", "md"),
		).rejects.toThrow(/column/i);
	});

	it("decodes UTF-8 across Blob chunk boundaries while retaining quoted multiline records", async () => {
		const header = 'name,note\r\n"';
		const headerBytes = new TextEncoder().encode(header).byteLength;
		const padding = "x".repeat(1024 * 1024 - headerBytes - 2);
		const csv = `${header}${padding}🌍\r\nstill here",ok`;
		const progress: { progressPercent: number; message: string }[] = [];
		const output = await convertTabularBlob(
			new Blob([csv]),
			"csv",
			"json",
			(entry) => progress.push(entry),
		);
		const parsed = JSON.parse(await output.text()) as {
			name: string;
			note: string;
		}[];
		expect(parsed[0]?.name.endsWith("🌍\r\nstill here")).toBe(true);
		expect(parsed[0]?.note).toBe("ok");
		expect(progress.some((entry) => entry.message.includes("1048576 of"))).toBe(
			true,
		);
		expect(progress.at(-1)?.progressPercent).toBe(100);
	});
});
