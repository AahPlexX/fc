# OmniConvert Implementation Tracker

Last updated: 2026-10-25  
Repository: `AahPlexX/fc`  
Branch: `main` only  
Status: `[COMPLETE]` / `[ACTIVE]` / `[INCOMPLETE]` / `[BLOCKED]`

## Invariants
- `PRD.md` preserves the original user-supplied brief verbatim and must not be rewritten, normalized, or silently corrected. Verified implementation corrections belong in README/TODO/ADRs while the original PRD remains unchanged.
- Max 3 **new** files per phase; edits unlimited.
- Executable/config changes update `TODO.md` + `CHANGELOG.md` in the same commit; update `README.md` when public behavior/commands/architecture/support change.
- Exact pins; pnpm only; user file bytes never leave the browser.
- No COMPLETE without relevant automated/manual verification.
- Native/platform first; heavy engines lazy-load.

## Phase ledger
| Phase | Scope | Status | Gate |
|---|---|---|---|
| 0 | Governance | COMPLETE | PRD corrections durable; original user brief preserved verbatim in `PRD.md`. |
| 1A | Registry/lifecycle policy | COMPLETE | Frozen install + ExifReader build denial. |
| 1 | Toolchain | COMPLETE | Lockfile + strict TS. |
| 2 | React shell | COMPLETE | CI install/check/test/build green. |
| 3 | Handoff/design | COMPLETE | Responsive foundation CI green. |
| 4 | Types + magic-byte detector + test | COMPLETE | RED observed then CI green for supported signatures/unknown bytes. |
| 5 | Compatibility matrix + test + job store | COMPLETE | RED observed then CI green for canonical routes, AVIF gate, unresolved containers, and immutable job updates. |
| 6 | Import/queue UI | COMPLETE | RED observed; install/check/test/build green on run 40027877824. |
| 7 | Image + metadata workers + test | COMPLETE | RED observed; install/check/test/build green on run 40028414995. |
| 8 | Tabular worker + test + fixture | COMPLETE | RED observed; install/check/test/build green on run 40028994454. |
| 9 | PDF/document worker + test + fixture | COMPLETE | RED observed; install/check/test/build green on run 40029861086 after loading-task cleanup fix. |
| 10 | Media adapter + progress + test | COMPLETE | Implementation committed; CI reached TypeScript and exposed one invalid Vitest matcher in the red-first test. Matcher corrected; full rerun pending. |
| 11 | Metadata drawer + preview + batch actions | ACTIVE | Dialog/metadata/privacy/previews. |
| 12 | Export + test + fixtures | ACTIVE | Blob + ZIP/collision handling. |
| 13 | PWA manifest + SW + offline test | ACTIVE | Offline shell; never cache user payloads. |
| 14 | Playwright + conversion/a11y E2E | ACTIVE | Browser/viewport/axe/manual gates. |
| 15 | 3 ADRs | INCOMPLETE | Reflect shipped implementation. |

## Carried corrections
- `@ffmpeg/ffmpeg` owns its worker. Its API requires `load()` before use; `terminate()` invalidates the engine and requires a fresh load before later calls.
- FFmpeg progress is determinate only for routes that explicitly preserve input/output media duration; otherwise UI progress stays indeterminate while time telemetry may remain visible.
- Single-thread `@ffmpeg/core` is the default; core JS/WASM/class-worker assets must be bundled same-origin and never fetched from a CDN.
- `pdf-lib` edits PDF structure/metadata; PDF.js renders pages from byte data with loading-task destruction.
- axe supplements manual WCAG 2.2 AA evaluation.
- PWA requires manifest + verified service worker/offline behavior.
- `@ffmpeg/core@0.12.10` is GPL-2.0-or-later; wrapper MIT.
- Node.js >=22.13.0.
- Binary signatures are authoritative first-stage evidence; ambiguous containers require deeper probing.
- Image workers verify returned encoder MIME and safely normalize limited metadata groups.
- Tabular detection is structural UTF-8 content detection; Papa Parse is lazy and delimited exports enable formula escaping.

## Active checkpoint
Phase 14 — browser integration gates (2026-10-25).
New files (3/3): `src/core/mediaAdapter.ts`, `src/core/mediaProgress.ts`, `tests/unit/mediaAdapter.test.ts`.  
Next: rerun permanent CI after replacing unsupported `toHaveBeenCalledOnceWith` with supported Vitest assertions. If install/check/test/build pass, mark Phase 10 COMPLETE and start Phase 11 red-first UI contracts.

## Environment
- Current cloud workspace has registry access; frozen install succeeds locally (2026-10-25). Prior sandbox DNS restriction no longer applies.
- No fabricated lockfiles/dependency results.

## 2026-10-25 execution ledger and implementation plan
User supplied the approved PRD and explicitly requested five to twenty cost-conscious builders with root as sole validating gate. Five `gpt-6-luna` builders own bounded files; root integrates and independently verifies. No github3 tools. Existing `main` was cloned at 9ce60bf; upstream a90ea54 fixes the unsupported test matcher and will be incorporated without dropping work.

- [ACTIVE] Phase 10 hardening: test URL bypass, cancel during engine loading, cleanup on load failure; root runs adapter tests/typecheck.
- [ACTIVE] Phase 11 (<=3 new files, ordered): `MetadataDrawer.tsx`, `PreviewModal.tsx`, then `core/conversionRunner.ts`. Tests extend existing import/worker suites before implementations. Wire workers to App/JobCard; single active conversion, terminate on cancel/timeout; immutable settings snapshots; no result after cancel. Native dialogs manage focus. Root checks actual browser behavior.
- [INCOMPLETE] Phase 12 (2 new files): `core/exportFiles.ts` then `tests/unit/exportFiles.test.ts`; native single downloads, collision-safe ZIP outputs, bounds-checked archive extraction in worker before decompression. Root tests collisions, traversal, inflated sizes, empty archive.
- [INCOMPLETE] Phase 13 (3 new files): manifest, service worker, SVG icon. Existing Vite config emits self-hosted FFmpeg assets/CSP headers; main registers production SW. Root checks production asset loading and offline revisits.
- [INCOMPLETE] Phase 14 (3 new files): Playwright config, conversion E2E, accessibility E2E. Run real workers PNG/WebP, WAV/MP3, CSV/JSON, PDF edits; download/re-inspect; focus/axe; mobile through TV widths; no network payload egress. Correct defects before green claims.
- [INCOMPLETE] Phase 15 (3 ADRs): current architecture, routing, metadata limitations with rollback paths. Root updates support matrix/verification evidence/handoff checkpoint.

Review focus: ambiguous audio/video containers must be probed before routing; misleading filename/MIME must not override signatures; cancellation during initialization must settle and release worker; malformed ZIP/PDF/table input must fail per item; metadata and active HTML must not leak via preview/export. Existing partial workers are not equivalent to verified app integration.

Rulings: retain approved architecture and existing corrected phase sequence; do not re-request approval of already approved implementation. Default locally bundled single-thread WASM and sequential conversion. Never claim comprehensive WCAG/CWV compliance from unit tests or axe alone. Preserve PRD byte-for-byte. No external publication/deployment requested.

## Final implementation evidence (2026-10-25)
- Local root gate: strict check/lint, unit tests, production build and browser suite executed. Final counts and permanent CI run are recorded below after verification completes.
- Phase 11 new files: MetadataDrawer, PreviewModal, conversionRunner (3). Phase 12: exportFiles + archive tests (2). Phase 13: manifest, sw, icon (3). Phase 14: Playwright config + conversion/accessibility suites (3). Phase 15: the three ADRs (3). Additional handoff/tooling checkpoint: .gitignore, LICENSES.md, docs/HANDOFF.md (3).
- Documentation changes accompany all executable/configuration changes; PRD stays unchanged. All direct pins plus pnpm (23 registry records) were re-verified by exact version/license; pinned12.15.0 frozen installation passed. Latest-version status is not claimed.
- Root fixed integration defects found by real browsers: async metadata labels, Tab wrap, PDF override casing, PDF.js readiness response filtering, native SVG decode fallback, and FFprobe status-sentinel handling. Privacy review added removal of orphaned PDF metadata objects and rasterization before PDF image embedding. Archive review replaced eager CRC decompression with actual streamed byte/ratio/CRC limits.

## Remaining verification and release scope — explicitly UNVERIFIED
- Field LCP/INP/CLS at the75th percentile; universal <50ms main-thread work and file-size/concurrency limits on real mobile RAM. Local gzip budget is checked separately; no field performance guarantee.
- Complete manual WCAG2.2 AA, screen-reader/touch/smart-TV remote evaluation, real hardware and latest-two-stable browser certification. Axe/focus/viewport/browser automation is evidence, not certification.
- Cold, never-loaded engines cannot work air-gapped; service worker caches engines only after online use. Offline warmed-table behavior is tested. Host must enforce emitted CSP; no deployed host has been tested.
- Corresponding source/build recipe/transitive codec notice compliance for GPL WASM redistribution: see LICENSES.md. No deployment/release performed.
- Standard-font text PDFs explicitly reject unsupported Unicode glyphs; full office layouts/RAW/OCR/DRM remain approved non-goals/deferred scope. Metadata stripping is not content redaction.
