# ADR 0001 — Local worker execution

Date: 2026-10-25. Status: implemented, browser tested.

## Context and choice
User payloads must remain on-device and large engines must stay out of the entry bundle. Keep the approved React/Vite/TypeScript shell and use dedicated workers for metadata/detection, raster encoding, tables, PDFs and ZIP operations. FFmpeg already owns a worker: `conversionRunner.ts` invokes the wrapper directly, supplies same-origin pinned core/WASM/wrapper assets, and terminates it after each operation. Sequential jobs and a shared abort-aware media slot bound all import probes, metadata inspections and transcodes to one heavy engine. Generation-owned cancellation prevents late creation/loading from disturbing later jobs. `MediaAdapter` remains a separately tested reusable lifecycle API, not a second engine running beside conversions.

Alternatives were a cloud conversion API (violates zero uploads) and routing all formats through FFmpeg (unnecessary 32 MB core for tables/images). Neither is used. Memory buffers are structured-cloned or transferred to workers; cancellation and five-minute timeouts terminate the active worker and suppress stale completion. SVG has a bounded native image/canvas fallback because actual browsers reject SVG ImageBitmap worker decoding; see ADR 0002.

## Delivery and evidence
Vite copies assets from installed exact package versions into `/engines/`; production CSP allows only same-origin connections, scripts and workers, with Blob media/image previews. Single-thread core avoids SharedArrayBuffer/COOP/COEP requirements. `_headers` is emitted for compatible hosts; other hosts must implement the same CSP themselves. No COOP/COEP or multithread capability is claimed.

The service worker precaches generated static entry imports/CSS and caches on-demand application assets after first use. User Blobs and download results never become HTTP cache entries. Offline behavior is verified after warming a table engine, not claimed for engines never loaded. Root shell hosting is assumed (`/`, not arbitrary subpaths).

Primary evidence: pinned installed `@ffmpeg/ffmpeg@0.12.15` classes/worker source; `@ffmpeg/core@0.12.10` package metadata; production Playwright conversions and offline tests. See README and TODO for test counts/current CI evidence. Field CWV and universal main-thread latency budgets remain UNVERIFIED.

## Consequences and rollback
Cold media load needs roughly 32 MB of WASM (10.4 MB gzipped). Fresh engines trade initialization for deterministic memory release. Keep assets local; never introduce CDN/file upload fallbacks. A worker route can be replaced independently without changing job state. Remove service-worker registration and invalidate its cache if offline delivery regresses; online conversion remains usable.

2026-10-25 continuation: table File/Blob reading and output UTF-8 Blob construction now occur inside the worker; the UI receives an encoded Blob. SW cache IDs are derived from build content including fixed-path engine bytes. Root74-unit/54-browser evidence and lab limits are in `docs/verification.md`.

The table worker additionally decodes CSV/TSV incrementally, retaining native UTF-8 state across 1MiB slices and pinned Papa 5.7.0 ParserHandle CSV state. Progress is measured from bytes/rows and precedes final Blob delivery. The64MiB input cap and full-output accumulation are explicit; no constant-memory full-JSON guarantee is claimed.
