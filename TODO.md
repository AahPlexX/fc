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
| 0 | Governance correction (`README`, tracker, changelog) | COMPLETE | Corrected PRD contradictions are durable. |
| 1A | Registry verification + lifecycle policy | COMPLETE | Node 22.13.0 + pnpm 12.15.0; frozen install passed; ExifReader postinstall explicitly denied. |
| 1 | Toolchain (`package.json`, `pnpm-lock.yaml`, `tsconfig.json`) | ACTIVE | Runner will commit its verified lockfile; then commit strict `tsconfig.json`. |
| 2 | React shell (`index.html`, `src/main.tsx`, `src/App.tsx`) | INCOMPLETE | `pnpm check && pnpm test && pnpm build`. |
| 3 | Handoff/design (`AGENTS.md`, `vite.config.ts`, `src/styles/tokens.css`) | INCOMPLETE | Responsive 320–3840px, focus/reduced-motion baseline. |
| 4 | Domain types + magic-byte detection + unit test | INCOMPLETE | FR-002 spoof/signature coverage. |
| 5 | Compatibility matrix + test + job store | INCOMPLETE | FR-003 domain-bound target sets. |
| 6 | Import/queue UI (3 components) | INCOMPLETE | FR-001/004/006/007; keyboard/pointer parity. |
| 7 | Image + metadata workers + test | INCOMPLETE | Raster conversion/metadata/cancel/AVIF capability gate. |
| 8 | Tabular worker + test + fixtures | INCOMPLETE | CSV/TSV/JSON/MD/HTML-table round trips. |
| 9 | PDF/document worker + test + fixture | INCOMPLETE | pdf-lib metadata + PDF.js page rasterization. |
| 10 | Media adapter + progress model + test | INCOMPLETE | Lazy FFmpeg, cancellation, truthful progress degradation. |
| 11 | Metadata drawer + preview + batch actions | INCOMPLETE | Dialog focus/Escape/metadata/privacy/previews. |
| 12 | Export + test + fixtures | INCOMPLETE | Blob download + ZIP + collision handling. |
| 13 | PWA manifest + service worker + offline test | INCOMPLETE | Offline shell without caching user file payloads. |
| 14 | Playwright config + conversion/a11y E2E | INCOMPLETE | Chromium/Firefox/WebKit + required viewport/axe/manual checks. |
| 15 | 3 ADRs | INCOMPLETE | ADRs reflect shipped implementation. |

## Verified corrections carried into implementation

- `@ffmpeg/ffmpeg` already owns its transcode worker; no redundant wrapper worker by default.
- FFmpeg.wasm `progress` is experimental; use determinate progress only when trustworthy, otherwise phase/indeterminate status.
- `pdf-lib` edits PDF structure; PDF.js renders PDF pages.
- axe is an automated regression gate, not complete WCAG 2.2 AA proof; manual checks remain required.
- PWA status requires both manifest and service-worker/offline behavior.
- `@ffmpeg/core@0.12.10` is GPL-2.0-or-later; wrapper is MIT.
- Runtime floor is Node.js >=22.13.0 to satisfy the pinned toolchain including PDF.js.

## Active checkpoint

Phase 1 — Toolchain.  
Current file: `.github/workflows/bootstrap-lockfile.yml`.  
Next: runner commits verified `pnpm-lock.yaml` to `main`; then commit strict `tsconfig.json`, convert CI to frozen-install/check/test/build, and start Phase 2.

## Environment notes

- Local execution sandbox has no external package-host DNS; GitHub Actions is the registry-connected verification environment.
- No fabricated lockfiles or dependency results.
- Bootstrap runner argument typo (`--lockifile-only`) found from CI logs and corrected to `--lockfile-only` before any generated file was committed.
