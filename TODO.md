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
| 12 | Conversion orchestration + single/batch export | ACTIVE | Pure core green on run 40163096278; runtime-dispatch RED verified on run 40163277102; browser runtime/App wiring committed and awaiting full CI green. |
| 13 | PWA manifest + SW + offline test | INCOMPLETE | Offline shell; never cache user payloads. |
| 14 | Playwright + conversion/a11y E2E | INCOMPLETE | Browser/viewport/axe/manual gates. |
| 15 | 3 ADRs | INCOMPLETE | Reflect shipped implementation. |

## Phase 12 implementation
- `ConversionOrchestrator` owns one `AbortController` per active job, emits accessible loading/converting telemetry, dispatches by tested engine plan, and cancels real work.
- `createBrowserConversionRuntime()` uses disposable module workers for image/tabular/PDF jobs and a lazily created reusable FFmpeg adapter for media.
- FFmpeg core JS/WASM are dynamically imported from `@ffmpeg/core` package assets and passed as same-origin application URLs; no CDN fallback.
- `getExecutableTargets()` filters the broad semantic compatibility matrix to routes that the current engine surface can actually execute.
- App now wires Convert, Cancel, Download, sequential Convert All, completed ZIP export, and Clear Completed.
- Individual and ZIP downloads use explicit object-URL cleanup; completed preview URLs remain scoped/revoked by the preview lifecycle.

## Active checkpoint
Phase 12 — integrated browser runtime/export.  
New files remain 3/3: `src/core/conversionOrchestrator.ts`, `src/core/exportManager.ts`, `tests/unit/conversionFlow.test.ts`.  
Current edits: `src/core/mediaAdapter.ts`, `src/App.tsx`, `src/components/DropzoneHeader.tsx`, `src/components/JobCard.tsx`, README/CHANGELOG/TODO.  
Next: require permanent CI install/check/test/build to pass worker dispatch, Vite ffmpeg asset URL imports, App callback typing, and existing unit contracts. Fix root causes only. On green, mark Phase 12 COMPLETE and begin Phase 13 PWA/offline work.

## Known PRD completion gaps after Phase 12
Do not claim product completion yet. Remaining original-PRD coverage to implement/verify in appended phases includes: BMP/ICO/image-to-PDF output; SVG raster input; image dimensions/quality presets; Markdown-table input; Markdown/TXT/HTML document routes; PDF split/merge/image embedding/multi-image compilation; ZIP extraction and zip-bomb guardrails; media signature/container probing for MP4/MOV/M4A/WebM/MKV/AAC/raw MP3; media metadata inspection; JPEG EXIF metadata writing; import MIME/extension corroboration; file memory warnings/timeouts; and full browser conversion-path/a11y/performance verification.

## Environment
- Local sandbox has no package-host DNS; GitHub Actions is the registry-connected verification environment.
