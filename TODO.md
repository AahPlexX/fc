# OmniConvert Implementation Tracker

Last updated: 2026-10-24  
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
| 10 | Media adapter + progress + test | COMPLETE | Matcher defect corrected; install/check/test/build green on run 40162153846. |
| 11 | Metadata drawer + preview + batch actions | ACTIVE | RED valid; first implementation CI found action-group ARIA semantics and audio-caption lint issues. Root-cause fixes committed; rerun pending. |
| 12 | Export + test + fixtures | INCOMPLETE | Blob + ZIP/collision handling plus conversion orchestration. |
| 13 | PWA manifest + SW + offline test | INCOMPLETE | Offline shell; never cache user payloads. |
| 14 | Playwright + conversion/a11y E2E | INCOMPLETE | Browser/viewport/axe/manual gates. |
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
- Workbench overlays use native `<dialog>` semantics. Blob preview URLs are scoped to the selected job and revoked on cleanup.
- User-supplied audio preview remains playable without fabricated captions/transcripts; a visible note explains the PRD's no-transcription scope and the lint exception is narrowly documented.

## Active checkpoint
Phase 11 — metadata drawer, preview, and batch actions.  
New files (3/3): `src/components/MetadataDrawer.tsx`, `src/components/PreviewModal.tsx`, `tests/unit/workbenchDialogs.test.tsx`.  
Next: rerun permanent CI after changing the job action wrapper to `role="group"` and documenting the intentional audio-caption lint exception. If green, mark Phase 11 COMPLETE and begin Phase 12 red-first export/orchestration contracts.

## Environment
- Local sandbox has no package-host DNS; GitHub Actions is registry-connected verification.
- No fabricated lockfiles/dependency results.
