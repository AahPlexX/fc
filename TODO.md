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
| 11 | Metadata drawer + preview + batch actions | ACTIVE | RED valid; first two lint passes strengthened native semantics. Job actions now use `fieldset`/`legend`; full rerun pending. |
| 12 | Export + test + fixtures | INCOMPLETE | Blob + ZIP/collision handling plus conversion orchestration. |
| 13 | PWA manifest + SW + offline test | INCOMPLETE | Offline shell; never cache user payloads. |
| 14 | Playwright + conversion/a11y E2E | INCOMPLETE | Browser/viewport/axe/manual gates. |
| 15 | 3 ADRs | INCOMPLETE | Reflect shipped implementation. |

## Active checkpoint
Phase 11 — metadata drawer, preview, and batch actions.  
New files (3/3): `src/components/MetadataDrawer.tsx`, `src/components/PreviewModal.tsx`, `tests/unit/workbenchDialogs.test.tsx`.  
Next: rerun permanent CI after replacing the generic action group with native `fieldset`/`legend`. If green, mark Phase 11 COMPLETE and begin Phase 12 red-first export/orchestration contracts.

## Environment
- Local sandbox has no package-host DNS; GitHub Actions is registry-connected verification.
- No fabricated lockfiles/dependency results.
