# ADR 0002 — Signature and stream validated routing

Date: 2026-10-25. Status: implemented, browser tested.

## Context and choice
Extensions and File.type are untrusted hints. `metadata.worker.ts` reads the first 4 KiB for signatures, then validates complete UTF-8 structured text up to 64 MiB. `magicBytes.ts` recognizes binary containers without pretending they prove stream type. Ambiguous MP4/MOV/M4A/Ogg/Matroska containers remain locked until FFprobe finds an audio stream or a video stream that is not attached cover art. The format/domain pair feeds a declarative compatibility matrix; `runConversion` validates it again at execution.

An extension-only router was rejected because renamed files defeat it. A universal FFmpeg pipeline was rejected because small images/tables should not initialize WASM. The approved purpose-specific routes remain: native images/custom BMP and ICO, Papa Parse/native serializers, pdf-lib plus PDF.js, and FFmpeg. AVIF encoding appears only after a MIME-verified capability probe; silent PNG fallback is an error. SVG rasterization uses an inert browser image/canvas fallback limited to 16 megapixels; native worker SVG decoding failed an actual Chromium test. SVG scripts/foreign resources do not execute in image context, and temporary URLs are revoked.

Markdown tables route as tables; other `.md` text routes as documents. Plain UTF-8 `.txt` requires the explicit text extension; arbitrary unknown bytes are not treated as documents. Legacy Office/RAW/DRM/OCR remain outside the approved MVP.

## Evidence and limitations
Tests cover spoofed MIME/extensions, invalid domain pairs, malformed input isolation, real SVG/BMP/ICO/Markdown outputs and real video-to-audio extraction. Pinned core 0.12.10 was observed to return FFprobe status -1 with complete valid JSON: the runner permits only 0/-1, then requires parseable stream/format data and a usable stream; missing/positive-error reports fail. Core upgrades must rerun this regression.

PDF image export uses one chosen page (first by default); PDF output accepts an ordered 1-based page list for extraction/reordering. Compile/merge preserves queue order. Standard-font text-to-PDF rejects unsupported glyphs explicitly rather than corrupting output. Full CommonMark layout and complex HTML input are not advertised.

## Rollback
Change a matrix entry and its tests to disable a broken route. Keep source probing before target selection. A stronger decoder/renderer can replace a route without exposing incompatible domains or uploading payloads.

Production2026-10-26: tables cap input/output at64MiB,250k rows,2k columns and2M canonical cells. Shape checks precede rectangular JSON expansion; output bytes are counted before parts retention. Safe internal Papa header keys preserve __proto__ and other source column names. ZIP File intake rejects oversized archives before reading, inside the worker. Preview selects output handling by target format.

Phase20 preserves empty and whitespace-only CSV/TSV records, including quoted empties and records at stream boundaries. A final line terminator does not add a record; mismatched field counts fail explicitly. Root and CI evidence is in TODO and docs/verification.md.
