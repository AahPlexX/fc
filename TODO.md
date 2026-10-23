# OmniConvert Implementation Tracker

Last updated: 2026-10-23  
Repository: `AahPlexX/fc`  
Branch: `main` only  
Status: `[COMPLETE]` / `[ACTIVE]` / `[INCOMPLETE]` / `[BLOCKED]`

## Invariants
- Max 3 **new** files per phase; edits unlimited.
- Executable/config changes update `TODO.md` + `CHANGELOG.md` in the same commit; update `README.md` when public behavior/commands/architecture/support change.
- Exact pins; pnpm only; user file bytes never leave the browser.
- No COMPLETE without relevant automated/manual verification.
- Native/platform first; heavy engines lazy-load.

## Phase ledger
| Phase | Scope | Status | Gate |
|---|---|---|---|
| 0 | Governance | COMPLETE | PRD corrections durable. |
| 1A | Registry/lifecycle policy | COMPLETE | Frozen install + ExifReader build denial. |
| 1 | Toolchain | COMPLETE | Lockfile + strict TS. |
| 2 | React shell | COMPLETE | CI install/check/test/build green. |
| 3 | Handoff/design | COMPLETE | Responsive foundation CI green. |
| 4 | Types + magic-byte detector + test | COMPLETE | RED observed then CI green for supported signatures/unknown bytes. |
| 5 | Compatibility matrix + test + job store | ACTIVE | RED contract committed; matrix intentionally returns `[]`; CI must fail target assertions before implementation. |
| 6 | Import/queue UI | INCOMPLETE | FR-001/004/006/007; keyboard/pointer parity. |
| 7 | Image + metadata workers + test | INCOMPLETE | Raster/metadata/cancel/AVIF gate. |
| 8 | Tabular worker + test + fixture | INCOMPLETE | CSV/TSV/JSON/MD/HTML-table round trips. |
| 9 | PDF/document worker + test + fixture | INCOMPLETE | pdf-lib metadata + PDF.js rasterization. |
| 10 | Media adapter + progress + test | INCOMPLETE | Lazy FFmpeg/cancel/honest progress. |
| 11 | Metadata drawer + preview + batch actions | INCOMPLETE | Dialog/metadata/privacy/previews. |
| 12 | Export + test + fixtures | INCOMPLETE | Blob + ZIP/collision handling. |
| 13 | PWA manifest + SW + offline test | INCOMPLETE | Offline shell; never cache user payloads. |
| 14 | Playwright + conversion/a11y E2E | INCOMPLETE | Browser/viewport/axe/manual gates. |
| 15 | 3 ADRs | INCOMPLETE | Reflect shipped implementation. |

## Carried corrections
- FFmpeg wrapper already owns its worker; `progress` is experimental and degrades to phase/indeterminate state when needed.
- `pdf-lib` edits PDF structure; PDF.js renders pages.
- axe supplements manual WCAG 2.2 AA evaluation.
- PWA requires manifest + verified service worker/offline behavior.
- `@ffmpeg/core@0.12.10` is GPL-2.0-or-later; wrapper MIT.
- Node.js >=22.13.0.
- Binary signatures are authoritative first-stage evidence; ambiguous containers require deeper probing before targets unlock.

## Active checkpoint
Phase 5 — compatibility routing.  
Current file: `tests/unit/compatibilityMatrix.test.ts`.  
Next: observe CI RED against the intentional empty matrix, then implement only the tested domain/source routes and capability-gated AVIF; keep unresolved containers targetless until probing.

## Environment
- Local sandbox has no package-host DNS; GitHub Actions is registry-connected verification.
- No fabricated lockfiles/dependency results.
