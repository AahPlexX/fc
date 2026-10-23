# OmniConvert Implementation Tracker

Last updated: 2026-10-23  
Repository: `AahPlexX/fc`  
Branch: `main` only  
Status: `[COMPLETE]` / `[ACTIVE]` / `[INCOMPLETE]` / `[BLOCKED]`

## Non-negotiable invariants
- Maximum 3 **new** files per phase; edits to existing files are unlimited.
- Executable/config changes update this file and `CHANGELOG.md` in the same commit; update `README.md` when public behavior, commands, architecture, support, or requirements change.
- Exact dependency pins only; pnpm only.
- User file payloads never leave the browser.
- No phase is COMPLETE without its relevant automated/manual verification.
- Native/platform features before custom abstractions; heavy engines lazy-load.

## Phase ledger
| Phase | Scope | Status | Verification / next gate |
|---|---|---|---|
| 0 | Governance correction | COMPLETE | Corrected PRD contradictions are durable. |
| 1A | Registry verification + lifecycle policy | COMPLETE | Node 22.13.0 + pnpm 12.15.0; frozen install passed; ExifReader postinstall denied. |
| 1 | Toolchain | COMPLETE | Verified lockfile + frozen install + strict TypeScript. |
| 2 | React shell | COMPLETE | Permanent CI passed install/check/tests/build. |
| 3 | Handoff/design | COMPLETE | CI passed after Vite CSS declarations and scoped reduced-motion fix. |
| 4 | Domain types + magic-byte detection + unit test | ACTIVE | RED committed: detector contract/tests exist; stub returns `null`; CI must fail assertions before implementation. |
| 5 | Compatibility matrix + test + job store | INCOMPLETE | FR-003 domain-bound target sets. |
| 6 | Import/queue UI | INCOMPLETE | FR-001/004/006/007; keyboard/pointer parity. |
| 7 | Image + metadata workers + test | INCOMPLETE | Raster conversion/metadata/cancel/AVIF capability gate. |
| 8 | Tabular worker + test + fixtures | INCOMPLETE | CSV/TSV/JSON/MD/HTML-table round trips. |
| 9 | PDF/document worker + test + fixture | INCOMPLETE | pdf-lib metadata + PDF.js page rasterization. |
| 10 | Media adapter + progress model + test | INCOMPLETE | Lazy FFmpeg, cancellation, truthful progress degradation. |
| 11 | Metadata drawer + preview + batch actions | INCOMPLETE | Dialog focus/Escape/metadata/privacy/previews. |
| 12 | Export + test + fixtures | INCOMPLETE | Blob download + ZIP collision handling. |
| 13 | PWA manifest + service worker + offline test | INCOMPLETE | Offline shell without caching user file payloads. |
| 14 | Playwright config + conversion/a11y E2E | INCOMPLETE | Chromium/Firefox/WebKit + viewport/axe/manual checks. |
| 15 | 3 ADRs | INCOMPLETE | ADRs reflect shipped implementation. |

## Verified corrections carried into implementation
- `@ffmpeg/ffmpeg` already owns its transcode worker; no redundant wrapper worker by default.
- FFmpeg.wasm `progress` is experimental; determinate progress only when trustworthy, otherwise phase/indeterminate status.
- `pdf-lib` edits PDF structure; PDF.js renders PDF pages.
- axe is an automated regression gate, not complete WCAG 2.2 AA proof; manual checks remain required.
- PWA status requires both manifest and verified service-worker/offline behavior.
- `@ffmpeg/core@0.12.10` is GPL-2.0-or-later; wrapper is MIT.
- Runtime floor is Node.js >=22.13.0.
- Binary signatures are authoritative first-stage evidence; ambiguous containers remain unclassified until a deeper structural/stream probe.

## Active checkpoint
Phase 4 — Domain contracts / magic bytes.  
Current file: `tests/unit/magicBytes.test.ts`.  
Next: observe CI RED against the intentional `detectBinaryFormat()` null stub, then implement only enough signature logic to make the tests green; keep text formats and ambiguous stream/container probing for their owning phases.

## Environment notes
- Local execution sandbox has no external package-host DNS; GitHub Actions is the registry-connected verification environment.
- No fabricated lockfiles or dependency results.
