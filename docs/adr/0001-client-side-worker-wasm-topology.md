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

2026-10-25 continuation: table File/Blob reading and output UTF-8 Blob construction now occur inside the worker; the UI receives an encoded Blob. SW cache IDs are derived from build content including fixed-path engine bytes. Root75-unit/54-browser evidence and lab limits are in `docs/verification.md`.

The table worker additionally decodes CSV/TSV incrementally, retaining native UTF-8 state across 1MiB slices and pinned Papa 5.7.0 ParserHandle CSV state. Progress is measured from bytes/rows and precedes final Blob delivery. The64MiB input cap and full-output accumulation are explicit; no constant-memory full-JSON guarantee is claimed.

Production2026-10-26: engine URLs include installed core/wrapper versions so an older controller cannot mix engine versions with a new entry. Live probes/transcodes allow only file,pipe. SW waits for old clients, isolates caches and treats runtime cache faults as best-effort; hosts must retain older lazy assets. Release checks hash the complete artifact and compare copied engine bytes, without claiming upstream source attestation.

Lifecycle correction: main posts OMNICONVERT_CLAIM_CLIENTS after registration.ready. The message handler waits for worker-local activated state before claiming; cache cleanup alone gates activation. A delayed-activation WebKit reproduction observed worker-side activated while the page wrapper remained activating, so page-side state is not the readiness gate. Held-claim and overlapping-navigation regressions require activation, native client control and cache outcomes. Real PWA tests use isolated persistent browser profiles/processes; retries remain zero.

Final automated evidence: source0c37b2d/Validate40261796547 passes82 unit and75 browser scenarios; distribution/host/manual/field limits remain in TODO and docs/production.md.

Phase18 source5ea6d5a/Validate40348252463 adds static source delivery: versioned ExifReader package ZIP plus a source index/notice link, excluded from initial imports and precache. Root82-unit/78-browser/14-negative artifact gates and timezone checks pass; FFmpeg corresponding-source and real-host/manual/field claims remain separate.

Phase19 adds an operator-run, GET-only verifier for the selected origin: it checks local artifact inventory and streamed hosted hashes, security/MIME/cache headers and real404s under root, asset, engine, wrapper and source paths. It retains proxy/CA behavior and requires HTTPS outside explicit loopback fixtures. This prepares host validation; it is not proof of a deployment or source provenance.
