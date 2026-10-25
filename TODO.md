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
| 11 | Metadata drawer + preview + queue actions | COMPLETE | Run 40162718916 green. |
| 12 | Conversion orchestration + single/batch export | ACTIVE | RED observed on run 40162969527 with check green; planner/media/export helpers implemented and awaiting validation before App wiring. |
| 13 | PWA manifest + SW + offline test | INCOMPLETE | Offline shell; never cache user payloads. |
| 14 | Playwright + conversion/a11y E2E | INCOMPLETE | Browser/viewport/axe/manual gates. |
| 15 | 3 ADRs | INCOMPLETE | Reflect shipped implementation. |

## Phase 12 contract
- `planConversion()` rejects incompatible pairs and routes only currently executable image/tabular/PDF/media targets.
- `buildMediaCommand()` uses deterministic virtual-FS names, explicit codec recipes, optional `-map_metadata -1`, and only PRD-supported metadata keys.
- `buildOutputFileName()` and `deduplicateFileNames()` create stable collision-safe names.
- `createBatchArchive()` lazy-loads JSZip, adds byte-backed Blob outputs, and emits DEFLATE archives asynchronously.
- `triggerBlobDownload()` uses a temporary object URL and explicit delayed revocation.

## Active checkpoint
Phase 12 — conversion orchestration and export.  
New files (3/3): `src/core/conversionOrchestrator.ts`, `src/core/exportManager.ts`, `tests/unit/conversionFlow.test.ts`.  
Next: require permanent CI install/check/test/build to pass the pure planner/media/export contract. Then wire actual image/tabular/document/media conversion execution, cancellation, Download, Convert All, ZIP export, and Clear Completed by editing existing files only. Phase 12 remains ACTIVE until that browser-facing orchestration is verified.

## Known completion gaps after Phase 12
Do not mark the product complete until remaining original-PRD gaps are implemented and verified in appended phases or explicitly changed by the user. Current known gaps: BMP/ICO/image-to-PDF output, Markdown-table input, Markdown/TXT/HTML document routes, PDF split/merge/image embedding, ZIP extraction, media container probing/metadata inspection, JPEG metadata writing, image dimensions/quality controls, and production conversion-path browser verification.

## Environment
- Local sandbox has no package-host DNS; GitHub Actions is the registry-connected verification environment.
