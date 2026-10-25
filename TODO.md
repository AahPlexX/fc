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
| 0 | Governance | COMPLETE | Original user brief preserved verbatim in `PRD.md`; implementation corrections durable elsewhere. |
| 1A | Registry/lifecycle policy | COMPLETE | Frozen install + ExifReader build denial. |
| 1 | Toolchain | COMPLETE | Lockfile + strict TS. |
| 2 | React shell | COMPLETE | CI install/check/test/build green. |
| 3 | Handoff/design | COMPLETE | Responsive foundation CI green. |
| 4 | Types + magic-byte detector + test | COMPLETE | RED observed then CI green. |
| 5 | Compatibility matrix + job store | COMPLETE | RED observed then CI green. |
| 6 | Import/queue UI | COMPLETE | Run 40027877824 green. |
| 7 | Image + metadata workers | COMPLETE | Run 40028414995 green. |
| 8 | Tabular worker | COMPLETE | Run 40028994454 green. |
| 9 | PDF/document worker | COMPLETE | Run 40029861086 green. |
| 10 | Media adapter + progress | COMPLETE | Run 40162153846 green. |
| 11 | Metadata drawer + preview + queue actions | COMPLETE | Native semantic fixes complete; run 40162718916 green. |
| 12 | Conversion orchestration + single/batch export | ACTIVE | Red-first route/media/export contract prepared; targeted unit RED required before implementation. |
| 13 | PWA manifest + SW + offline test | INCOMPLETE | Offline shell; never cache user payloads. |
| 14 | Playwright + conversion/a11y E2E | INCOMPLETE | Browser/viewport/axe/manual gates. |
| 15 | 3 ADRs | INCOMPLETE | Reflect shipped implementation. |

## Carried corrections
- FFmpeg wrapper owns its worker; `load()` is required; `terminate()` invalidates the engine and requires a fresh load.
- FFmpeg progress is determinate only for routes explicitly known to preserve duration.
- FFmpeg core/WASM/class-worker assets remain same-origin with no CDN fallback.
- `pdf-lib` edits PDF structure; PDF.js renders pages from byte data.
- axe supplements, never replaces, manual WCAG 2.2 AA evaluation.
- `@ffmpeg/core@0.12.10` is GPL-2.0-or-later; wrapper MIT.
- Blob/object URLs are explicitly revoked after their user-accessible lifetime.
- Batch ZIP generation uses JSZip async APIs and collision-safe filenames.

## Active checkpoint
Phase 12 — conversion orchestration and export.  
New files (3/3): `src/core/conversionOrchestrator.ts`, `src/core/exportManager.ts`, `tests/unit/conversionFlow.test.ts`.  
Next: commit RED stubs and require install/check green with unit failures caused by unimplemented route/media/export behavior. Then implement route planning, metadata-aware media commands, collision-safe ZIP export, browser download cleanup, and real App conversion wiring by editing existing files only.

## Known completion gaps after Phase 12
The original PRD contains routes/features beyond the currently implemented engine surface. Do not mark the product complete until these are either implemented and verified in appended phases or explicitly rejected by a new user decision. Current known gaps include BMP/ICO/image-to-PDF output, Markdown-table input, Markdown/TXT/HTML document routes, PDF split/merge/image embedding, ZIP extraction, media container probing/metadata inspection, JPEG metadata writing, richer image sizing/quality controls, and production conversion-path browser verification.

## Environment
- Local sandbox has no package-host DNS; GitHub Actions is the registry-connected verification environment.
