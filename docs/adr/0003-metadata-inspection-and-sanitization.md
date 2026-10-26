# ADR 0003 — Scoped metadata policy and bounded archives

Date: 2026-10-25. Status: implemented, browser tested.

## Choice and alternatives
Use ExifReader to inspect image metadata, piexifjs to retain/edit JPEG EXIF, canvas re-encoding to discard other raster metadata, pdf-lib for standard document properties/catalog XMP, and FFmpeg tags/map-metadata for audio/video. A custom universal binary metadata parser would be brittle; loading exiftool/Exiv2 WASM is not needed for these supported fields.

Privacy mode removes inherited supported metadata first and then writes explicit overrides. JPEG edits support Artist, Copyright, ImageDescription and Software. Non-JPEG image re-encoding discards source metadata even when privacy is off; no preservation promise is made. Image pixel orientation is normalized by browser decoding. PDF metadata stripping targets the document Info dictionary and catalog XMP, not document content, attachments or annotation contents. FFmpeg outputs retain necessary/generated technical container/codec fields. This is metadata governance, not document redaction.

The UI inspects metadata lazily, edits supported fields, and can apply policies to matching queued domains. Running/completed jobs cannot be changed behind an already exported result. Native dialogs add explicit Tab wrapping, Escape close and opener focus restoration. Preview treats HTML/Markdown as text and never embeds active HTML.

## Archives and resource safety
ZIP imports are checked before decompression: directory/local bounds, declared sizes/ratio, 1,000 entries, 256 MiB input/expanded/output bounds, UTF-8 paths, duplicate names and encryption/symlink/nesting restrictions. Extraction then counts actual streamed bytes and ratio, pauses on limit breaches, and checks CRC before forming bounded Blobs. This second check is essential: directory size claims can lie. ZIP64 and legacy non-UTF-8 names fail explicitly. Output filenames are sanitized and collisions receive deterministic suffixes.

## Evidence and rollback
Real downloaded JPEG fixtures are re-inspected for absent GPS/inherited Artist and present explicit Copyright. Downloaded PDFs are re-inspected for stripped Author/dates and edited Title. Unit tests cover forged ZIP sizes, corruption, traversal and collisions. These checks do not prove every vendor metadata dialect or complete privacy redaction.

Disable a metadata writer or archive route if its regression fails; preserve original input in memory until the user removes it. A specialized replacement can stay behind the same worker protocol. Future lossless PNG/WebP metadata preservation requires explicit implementation and new output-reinspection fixtures.

2026-10-25 continuation: metadata inspection exposes loading/errors and aborts on close. ZIP generation is a cancellable workspace operation that prevents duplicate packing workers; completed jobs survive cancellation. The build includes core/wrapper license texts and candidate source-release pointers; exact binary reproduction and complete transitive notices remain a release gate, as recorded in LICENSES.

Production2026-10-26: ZIP imports pass File/Blob into the worker, check256MiB before arrayBuffer, then retain existing streamed expansion/CRC safeguards. Runtime package license texts are supplied alongside candidate codec notices; exact native binary-source mapping remains unverified, not silently inferred from version similarity. See LICENSES and docs/production.md.
