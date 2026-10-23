# OmniConvert Implementation Tracker

Last updated: 2026-10-23
Target branch: `main`
Target repository: `AahPlexX/fc` (confirmed writable, empty, default branch `main` on 2026-10-23)

Status vocabulary: `[COMPLETE]`, `[ACTIVE]`, `[INCOMPLETE]`, `[BLOCKED]`.

## Invariants

- Maximum three **new** files per phase; edits to existing files are unlimited.
- Every executable-code phase updates `TODO.md` and `CHANGELOG.md` in the same commit; update `README.md` when public commands, architecture, supported routes, or browser requirements change.
- Exact dependency versions only.
- Browser file payloads never leave the client.
- `main` is the only implementation branch unless the user explicitly overrides it.
- No requirement is marked complete until its tests and relevant manual verification pass.

## Corrected delivery sequence

### Phase 0 — Governance correction
- [COMPLETE] `README.md`
- [COMPLETE] `CHANGELOG.md`
- [COMPLETE] `TODO.md`
- Exit: PRD contradictions and corrected implementation ordering are durably recorded.

### Phase 1 — Installable toolchain
- [COMPLETE] `package.json`
- [BLOCKED] `pnpm-lock.yaml` — local execution sandbox cannot resolve external package hosts; generate with pnpm 12.15.0 once registry access is available.
- [INCOMPLETE] `tsconfig.json` — intentionally not started until the lockfile gate clears.
- Verify: exact dependency resolution, clean install, no caret/tilde ranges.

### Phase 2 — Buildable React shell
- [INCOMPLETE] `index.html`
- [INCOMPLETE] `src/main.tsx`
- [INCOMPLETE] `src/App.tsx`
- Verify: `pnpm build` and `pnpm check` exit 0.

### Phase 3 — Agent handoff + design foundation
- [INCOMPLETE] `AGENTS.md`
- [INCOMPLETE] `vite.config.ts`
- [INCOMPLETE] `src/styles/tokens.css`
- Verify: responsive root shell at 320px through 3840px with visible keyboard focus and reduced-motion handling.

### Phase 4 — Core domain contracts
- [INCOMPLETE] `src/core/types.ts`
- [INCOMPLETE] `src/core/magicBytes.ts`
- [INCOMPLETE] `tests/unit/magicBytes.test.ts`
- Verify FR-002 binary signatures and extension/MIME disagreement behavior.

### Phase 5 — Compatibility routing
- [INCOMPLETE] `src/core/compatibilityMatrix.ts`
- [INCOMPLETE] `tests/unit/compatibilityMatrix.test.ts`
- [INCOMPLETE] `src/core/jobStore.ts`
- Verify FR-003 and all domain-bound target sets.

### Phase 6 — Import + queue UI
- [INCOMPLETE] `src/components/DropzoneHeader.tsx`
- [INCOMPLETE] `src/components/JobCard.tsx`
- [INCOMPLETE] `src/components/ConversionQueue.tsx`
- Verify FR-001, FR-004, FR-006, FR-007 and keyboard/pointer parity.

### Phase 7 — Image + metadata workers
- [INCOMPLETE] `src/workers/image.worker.ts`
- [INCOMPLETE] `src/workers/metadata.worker.ts`
- [INCOMPLETE] `tests/unit/imageWorker.test.ts`
- Verify raster conversion, metadata read/strip/write, cancellation, capability-gated AVIF output.

### Phase 8 — Tabular worker
- [INCOMPLETE] `src/workers/tabular.worker.ts`
- [INCOMPLETE] `tests/unit/tabularWorker.test.ts`
- [INCOMPLETE] `tests/fixtures/tabular.ts`
- Verify CSV/TSV/JSON/Markdown/HTML-table round trips and malformed-input failures.

### Phase 9 — PDF/document worker
- [INCOMPLETE] `src/workers/document.worker.ts`
- [INCOMPLETE] `tests/unit/documentWorker.test.ts`
- [INCOMPLETE] `tests/fixtures/pdf.ts`
- Verify pdf-lib metadata/editing and PDF.js page rasterization. Do not claim arbitrary HTML/CSS-to-PDF fidelity.

### Phase 10 — Media engine adapter
- [INCOMPLETE] `src/core/mediaEngine.ts`
- [INCOMPLETE] `src/core/mediaProgress.ts`
- [INCOMPLETE] `tests/unit/mediaProgress.test.ts`
- Verify lazy FFmpeg hydration, single-thread fallback, cancellation, and trustworthy progress degradation.

### Phase 11 — Metadata/preview UI
- [INCOMPLETE] `src/components/MetadataDrawer.tsx`
- [INCOMPLETE] `src/components/PreviewModal.tsx`
- [INCOMPLETE] `src/components/BatchActions.tsx`
- Verify dialog focus restoration, Escape behavior, editable fields, privacy strip policy, previews.

### Phase 12 — ZIP export
- [INCOMPLETE] `src/core/export.ts`
- [INCOMPLETE] `tests/unit/export.test.ts`
- [INCOMPLETE] `tests/fixtures/files.ts`
- Verify individual Blob download and multi-result ZIP assembly with filename collision handling.

### Phase 13 — PWA/offline completion
- [INCOMPLETE] `public/manifest.webmanifest`
- [INCOMPLETE] `src/sw.ts`
- [INCOMPLETE] `tests/unit/offlinePolicy.test.ts`
- Verify offline shell/core-asset policy without caching user file payloads.

### Phase 14 — E2E, accessibility, responsive verification
- [INCOMPLETE] `playwright.config.ts`
- [INCOMPLETE] `tests/e2e/conversion.spec.ts`
- [INCOMPLETE] `tests/e2e/accessibility.spec.ts`
- Verify Chromium/Firefox/WebKit, required viewport matrix, automated axe scans, and documented manual WCAG checks.

### Phase 15 — Architecture records
- [INCOMPLETE] `docs/adr/0001-client-side-worker-wasm-topology.md`
- [INCOMPLETE] `docs/adr/0002-domain-segmented-conversion-routing.md`
- [INCOMPLETE] `docs/adr/0003-metadata-inspection-and-sanitization.md`
- Verify ADRs reflect the shipped implementation rather than the pre-implementation PRD.

## Active checkpoint

Current phase: Phase 1 — Installable toolchain.
Current file: `package.json` repository synchronization, followed by `pnpm-lock.yaml`.
Next step: commit the verified exact-pinned manifest to `AahPlexX/fc`, then generate the lockfile with pnpm 12.15.0 in a registry-connected environment and verify a frozen install. Only after that gate passes, create `tsconfig.json`.

## Known blockers

- [BLOCKED] Local lockfile generation: the execution sandbox cannot resolve registry/GitHub package hosts. Package versions were independently verified against primary registry/release sources; no lockfile is being fabricated.
