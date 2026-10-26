# OmniConvert implementation tracker

Last updated:2026-10-26. Repository: `AahPlexX/fc`. Branch: `main`.

## Current checkpoint
**COMPLETE — Phase17 automated scope (2026-10-26).** Root independently passes check/build,82 unit tests,75 browser scenarios/retries0 and release:check; [permanent Validate40261796547](https://github.com/AahPlexX/fc/actions/runs/40261796547) passes on source `0c37b2d`. Entry gzip85,843 bytes. PRD/package pins remain unchanged. No deployment performed.

Current active code files:none. Exact next file:`LICENSES.md` to establish complete native corresponding-source/build materials before public binary distribution. Environment-specific hosting validation starts in `docs/production.md` once a host is selected. Manual accessibility/physical devices, field metrics and real-device memory remain explicitly UNVERIFIED; this automated checkpoint does not close those release criteria.

The focus correction avoids refocusing natively closed dialogs; native media players are reachable with a final output-download boundary. Activation performs cache cleanup only. main posts a fixed control message after registration.ready; its handler waits on worker-local activated state before claiming. Root's500ms delay reproduced an outdated page-side activating snapshot despite worker-side activated in5/5 WebKit diagnostics. The strengthened test failed old code and18 held-claim/update cases now pass across3 engines. Persistent profiles isolate earlier automation-process faults; all cache/control outcomes remain mandatory.

Two new files this checkpoint were created sequentially: scripts/check-release.mjs, verified before docs/production.md. No deployment performed. Conditional next files after the gate:LICENSES.md for exact native-source/material coverage; docs/production.md for the selected HTTPS host's header/MIME/cache/update/rollback validation. Portable static hosting is the current assumption.

### Production implementation plan
Goal: close reproduced runtime/deployment gaps and produce a verifiable static release candidate plus a portable launch/rollback procedure. Architecture: keep all processing local, use bounded workers/native browser APIs and standard service-worker lifecycle; no telemetry uploads, accounts or new runtime dependencies. Spec: immutable `PRD.md`, verified corrections in README/ADRs, and the user's final production-readiness instruction.

Global constraints: main only; pnpm12.15.0 and exact pins; at most3 new files per checkpoint, created/verified sequentially; TODO+CHANGELOG co-commit; root alone approves integrated evidence. Existing TODO carries this plan to preserve the bounded-file rule.

Review focus: memory amplification/legacy bypass; archive preallocation; wrong-target/empty previews; storage quota/open-client updates; incomplete hosting/distribution artifacts. Each has an owned regression or release-artifact check below.

- [x] Tables: retain File/Blob worker contract; enforce input, canonical shape and UTF-8 output bounds on every public path; regressions use small injectable limits and preserve Unicode/header semantics.
- [x] Archive intake: check256MiB before reading, post File to worker, allocate bytes in worker; reject before a too-large Blob is read.
- [x] Preview: MD→PDF must finish with a useful output hint; PDF→PNG/JPEG must render the actual image; empty text must differ from loading. Downloaded outputs are re-inspected.
- [x] PWA/hosting: successful network reads survive cache-quota failure, cache lookup stays within the active build, normal waiting lifecycle preserves live clients, security/cache headers match preview/emitted artifact. Test actual built SW; host must retain old lazy assets.
- [x] Distribution: supply applicable npm/static-codec notice texts and immutable source evidence; no unsupported binary-source attestation claim.
- [x] Release gate: audit pinned dependency graph; check complete built assets/headers/SW tokens/license artifacts/budget; retain checksums/audit/browser evidence in CI; do not publish binary artifacts. New file1: `scripts/check-release.mjs`; only after it passes create new file2: `docs/production.md`. Reserve file3 unless a concrete need arises.
- [x] Root integration: independently inspected diffs, passed pinned check/unit/build/browser/artifact gates and request audits, committed/pushed synchronized docs, and verified permanent Validate40261796547 before marking the automated scope complete.

Ownership: exports=table worker/unit tests; dialogs=PreviewModal/conversion E2E; pwa=SW/Vite/accessibility E2E; worker_builder=archive worker/minimal App intake/export tests/performance E2E; media=LICENSES/public notices; release_supply_chain=read-only primary audit (initial full+prod audit zero advisories). Root=all integration, CI/release check, governance/runbook and independent validation. No builder may commit or create new repository files.

## Invariants
- `PRD.md` is the immutable original brief. Verified corrections live in README/TODO/ADRs; do not rewrite the original.
- pnpm only, exact dependency pins, main branch; <=3 new files per checkpoint.
- Executable/config changes co-commit TODO + CHANGELOG; update README for public behavior, architecture, commands or support changes.
- User file bytes remain on-device. Engines lazy-load same-origin; no CDN/API conversion fallbacks.
- Never mark untested behavior or field/manual compliance verified. Read AGENTS and relevant source/tests before resuming.

## Phase ledger
| Phase | Scope | Status | Evidence |
|---|---|---|---|
| 0–3 | Governance, registry/toolchain, React shell, responsive foundation | COMPLETE | Original history and permanent Validate workflows; PRD preserved. |
| 4–5 | Types, signatures, compatibility routing, immutable job state | COMPLETE | Unit signature/domain tests, including misleading MIME/extensions and unresolved containers. |
| 6 | Import and queue UI | COMPLETE | Picker/drop/paste, batch settings/actions, real browser queue tests. |
| 7 | Image/metadata workers | COMPLETE | Unit tests plus downloaded JPEG EXIF/GPS reinspection, BMP/ICO/SVG and resize tests. |
| 8 | Tables | COMPLETE | CSV/TSV/JSON/Markdown round trips, escaped Markdown/HTML serializers and real worker downloads. |
| 9 | PDF/document worker | COMPLETE | PDF metadata/pages/images/merge, PDF.js rendering and output reinspection; orphan metadata regression. |
| 10 | Media lifecycle/progress | COMPLETE | Unit cancellation/load/URL checks; real WAV->MP3 and probed video->audio, initialization cancellation. |
| 11 | Dialogs and integrated queue | COMPLETE | Native modal, Tab/Escape/focus, supported metadata edits, source/output previews, sequential runtime. |
| 12 | Export/archive/runtime | COMPLETE | Collision-safe downloads; streamed ZIP size/ratio/CRC enforcement; extraction and corrupt-input isolation. |
| 13 | PWA/offline/assets | COMPLETE (automated scope) | Manifest/SW, same-origin bundled core/CSP, warmed-table offline conversion with no user data in cache. |
| 14 | Browser/a11y/viewport/budget gates | COMPLETE (automated scope) |54/54 Playwright scenarios in CI; axe/focus and320–3840px viewport checks;85,396-byte gzip entry. |
| 15 | Three ADRs | COMPLETE | Current topology, routing and privacy/archive decisions with rollback paths. |
| 16 | Continued verification, resource/cancel fixes, worker Blob boundary, cache/source evidence | COMPLETE (automated scope) |75 unit/54 browser tests; Validate40214020264 green on b43e2a1. |
| 17 | Final production-readiness corrections and release checks | COMPLETE (automated scope) |82 unit/75 browser scenarios; Validate40261796547 green on0c37b2d;18 held-claim/update stress cases. |
| Handoff/tooling | Ignore outputs, distribution notes, durable handoff | COMPLETE | `.gitignore`, `LICENSES.md`, `docs/HANDOFF.md`; tracker/README/AGENTS/CHANGELOG current. |

## File-creation checkpoint record
This session: Phase 11 `MetadataDrawer.tsx`, `PreviewModal.tsx`, `conversionRunner.ts` (3); Phase 12 `exportFiles.ts`, archive unit tests (2); Phase 13 manifest/SW/icon (3); Phase 14 Playwright config + conversion/accessibility E2E (3); Phase 15 three ADRs (3); handoff/tooling `.gitignore`, LICENSES, HANDOFF (3). Concurrent upstream history has its own bounded checkpoints. No PRD edits.

## Integrated runtime and substantive corrections
- Root used five gpt-6-luna builders with bounded file ownership; root alone integrated/validated. No github3 calls.
- Signatures and complete structural text are inspected in a worker. Ambiguous media containers require stream probing before any targets unlock. AVIF output is MIME-probed at runtime.
- Sequential jobs, worker termination/cancellation/timeouts and immutable settings snapshots prevent stale output. Aggregate progress measures finished files; media time telemetry stays indeterminate where FFmpeg progress is unreliable.
- FFmpeg owns its worker. Fresh single-thread engines load pinned local core/wrapper assets, then terminate to release memory. `mediaAdapter.ts` is a separately tested reusable lifecycle contract.
- Native SVG image/canvas fallback is limited to 16 megapixels because worker ImageBitmap SVG decoding failed an actual browser check. Other raster work runs in the image worker; dimensions/quality are configurable.
- JPEG privacy scrubs inherited tags before explicit overrides. PDF privacy deletes Info/XMP objects as well as references. Images are re-encoded before PDF embedding so embedded JPEG EXIF cannot bypass privacy.
- PDF override keys are normalized. Worker replies are jobId-filtered because PDF.js also posts readiness messages. Pinned FFprobe core returns -1 with valid reports: only 0/-1 plus complete parsed stream/format evidence are accepted.
- ZIP64/encrypted/symlink/nested/unsafe/non-UTF-8 archives fail explicitly. Header checks precede decompression; actual streamed size/ratio/CRC checks precede Blob allocation. Eager `checkCRC32:true` must not return.
- Native downloads run synchronously from user clicks to preserve WebKit activation; JSZip remains lazy. Previews display text rather than executing HTML and revoke temporary URLs. Dialog edits survive metadata arrival, wrap Tab and restore opener focus.

## Concurrent upstream merge
Main advanced from a90ea54 through 057f619 while this workspace ran. Root preserved those commits and merged through 90173cc without force pushing. Upstream `ConversionOrchestrator` planning/contracts remain; its browser runtime delegates to the common runner. App reuses upstream export-manager naming/native download functions; ZIP creation delegates to bounded archive code. Static dialog contracts now match the consolidated effect-driven native UI; real browser coverage verifies focus/URLs/downloads.64 unit tests include the preserved upstream flow/dialog suites.

## Explicitly UNVERIFIED / release follow-up
- Field LCP/INP/CLS at the 75th percentile, universal <50ms main-thread work, realistic large-file/mobile-RAM limits, and current/previous stable browser certification. Playwright binaries are an automated engine sample.
- Full manual WCAG 2.2 AA, screen readers, touch/physical smart-TV remote/real hardware. Axe/focus/viewports do not establish universal conformance.
- Cold, never-loaded engines cannot operate air-gapped. Only shell and previously loaded engines are cached; warmed-table offline behavior is verified. A deployed host must enforce the emitted CSP; no deployment was tested.
- Exact corresponding source/build recipe and historical codec inputs for GPL WASM redistribution (candidate notices supplied): see LICENSES. No binary/public release claim.
- Standard-font document PDFs reject unsupported glyphs explicitly. Full CommonMark/Office/RAW/OCR/DRM remain outside the implemented narrow document path/approved non-goals. Metadata stripping does not redact content, annotations or attachments; media encoders may generate technical tags.

## Environment and reproducibility
Cloud workspace registry access works. All 22 direct runtime/dev package pins plus pnpm (23 records) were verified for exact version and declared license on 2026-10-25; latest-version status is not claimed. Pinned pnpm 12.15.0 install passed; initial shell fallback was 11.25.0.

Local WebKit needed supplemental Debian libraries downloaded into user-local Playwright sys/lib directories because root installation was unavailable. Actual browser launches/conversions passed with `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1`; ldconfig cannot see those local libraries. CI installed dependencies normally with `playwright install --with-deps` and passed without that flag. Scratch/caches are machine-local and ephemeral. Use `pnpm check`, `pnpm test`, `pnpm build`, then `pnpm test:e2e` to reproduce.

## Historical continuation — 2026-10-25 (before Phase17)
User reauthorized effective low-cost orchestration. The same five Luna builders owned separate bounded tasks; root remained the sole integrating/validating gate. Root independently reproduced additional cached-engine cancellation and ZIP reentrancy defects, validated primary package/source evidence, and resolved browser capability/type/measurement issues.

The continuation creates exactly 3 files, sequentially: `tests/e2e/performance.spec.ts` (independently checked before later files), `public/THIRD_PARTY_NOTICES.txt` (license texts/source pointers, build-copy verified), then `docs/verification.md` (frozen root evidence). Existing files carry all other changes. No package versions or PRD content changed. `actions/upload-artifact` v7.0.2 was pinned to its primary tag commit on 2026-10-25.

75 unit tests and 54 browser scenarios pass locally with retries 0. Full test output/result attachments remain in ignored test-results; CI retains browser evidence 14 days. Root confirmed template cache fingerprint invalidation and exact notice copy into dist. The measured Chromium long task belonged to harness fixture injection, not the conversion interval. Firefox/WebKit unsupported signals stay unknown; WebKit pointer-event timing is not a field INP claim. See verification report for exact samples and meaningful limitations.

Remaining gates are the explicit field/manual/source-reproduction items above; source traceability is narrowed to a matching candidate publish commit and fully verified package SRI, with moving build references/provenance uncertainty recorded. Cold engine availability is still not promised before assets load. No external deployment/release was performed.

Final local candidate adds PDF ISO date inspection (read-only), actual chunked CSV/TSV reads/telemetry and stateful UTF-8 decoding. Root reproduced split-character corruption and verified the pure worker and real-browser regressions. Frozen root result: 75 unit tests and54 browser scenarios pass; permanent Validate40214020264 confirms the promoted source.

Root final review reproduced another CSV boundary defect: an incomplete header prematurely fixed empty column names, while Papa's first-MiB newline guess could retain CR in the next column name. A quote-aware incremental separator sniff now supplies the newline explicitly. One regression covers LF/CRLF/CR and CRLF split across slices; the root unit gate now passes75 tests. The64MiB input cap is not an output-expansion cap; complete table/output accumulation remains an explicit memory limitation.

## Production pass evidence — 2026-10-26
82 unit tests across10 files and72 browser scenarios pass with retries0; lint covers39 source/test/config/script files. Release checker accepts the actual build and rejects missing core JS, content-tampered WASM, escaping index paths, unsubstituted SW tokens, permissive CSP, notice drift and symlinks. It invalidates stale evidence after failure. Root verified13 emitted npm package license texts byte-for-byte, preserving upstream whitespace/CRLF; notice245,631 bytes, SHA256 `63511cd975d8c85c7effd9e2f3555d0266294b9f703d678a421601eaef017c08`.

SW waiting/cache cleanup is exercised across all3 engines. The final named-cache worker and persisted quota probe show a rejected write plus successful uncached network response in all3 engines; the test requires observed injection and cannot pass a missing write as success. Field/manual/real-host and exact upstream binary-source claims remain unverified. Live media permits only file/pipe protocols. Versioned core/wrapper paths derive from exact dependency pins. Native FFmpeg5.1.4 was verified from WASM strings; npm latest core remains0.12.10 as of2026-10-26. The bounded advisory review establishes no exhaustive native-decoder security claim.

Corrective CI40253738993 passed keyboard behavior but exposed an activation dependency. Source a387e13 then passed Validate40258988170 (82/75) with claiming outside activation and persistent SW profiles. A final preview check reproduced excluded native media controls; the corrected real WAV→MP3 cases traverse both players, verify byte-equal preview download and boundary wrapping.

A subsequent full run passed74/75 and exposed stale page-side activation state. Root's500ms activation delay reproduced5/5 failures while worker-side activated beacons were observed. main now sends the fixed request after registration.ready; the message handler owns the activated-state wait. The new regression fails the prior main-side wait and18 repeated held-claim/update cases pass across3 engines. Native claim occurs only at worker-side activated; actual controller, waiting behavior and both cache outcomes remain required. Final root gate passes82/75; Validate40261796547 is green on0c37b2d. Source-distribution/host/manual/field criteria above remain open.
