# OmniConvert agent handoff

## Start here
1. Read `PRD.md` first. It is the verbatim original user-supplied brief and is an immutable historical/product baseline unless the user explicitly orders that exact file changed.
2. Read `TODO.md` for the active phase and exact resume point.
3. Read the relevant implementation and tests before editing.
4. Use `README.md` for verified current architecture/corrections and `CHANGELOG.md` for shipped history. When implementation research corrects a claim from `PRD.md`, preserve the original PRD text unchanged and record the correction in README/TODO/ADR documentation instead.

## Commands
- Install: `pnpm install --frozen-lockfile`
- Check: `pnpm check`
- Test: `pnpm test`
- Build: `pnpm build`

## Repository invariants
- Work only on `main` unless the user explicitly overrides it.
- Use pnpm only and exact dependency pins only.
- Maximum 3 new files per phase; edits to existing files are unlimited.
- Every executable/config phase updates `TODO.md` and `CHANGELOG.md` in the same commit; update `README.md` when public behavior, commands, architecture, support, or requirements change.
- `PRD.md` must remain verbatim. Do not normalize formatting, fix citations, update package versions, silently correct claims, or rewrite wording inside that file; put verified deltas elsewhere.
- Never transmit user-selected file bytes off-device. Network access is for application assets only.
- Heavy engines are lazy-loaded. Prefer browser/platform APIs before dependencies or custom abstractions.
- UI must remain usable from 320px through 3840px+, keyboard-complete, reduced-motion aware, and WCAG 2.2 AA-oriented.
- Do not mark a phase COMPLETE before the pinned `Validate` workflow passes its relevant checks.

## Architecture guardrails
- Format routing is signature/domain driven; extension and browser MIME are corroborating inputs, never sole authority.
- FFmpeg.wasm already owns its transcoding worker. Do not wrap it in another worker without measured need.
- FFmpeg.wasm percentage progress is experimental; degrade to phase/indeterminate status when reliable progress cannot be derived.
- `pdf-lib` edits/creates PDFs; PDF.js renders pages.
- Automated axe checks supplement, never replace, manual accessibility evaluation.
- PWA claims require both manifest and verified service-worker/offline behavior.

## Current state
`TODO.md` is the single source of truth for implementation phase status. `PRD.md` is the immutable verbatim source brief. Keep both roles distinct so future agents can resume without losing either original intent or verified implementation reality.

## Integrated worker map (2026-10-25)
- `src/core/conversionRunner.ts`: execution boundary; jobId-filtered worker requests, abort/timeout termination, direct FFmpeg lifecycle/probe, SVG native fallback. Read before touching App execution. `mediaAdapter.ts` is an independently tested reusable contract, not the live UI adapter.
- `metadata.worker.ts`: binary-first File detection (`detect`), full structured text up to64 MiB, normalized image/PDF tags (`inspect`).
- `image.worker.ts`: native raster encodes, BMP/ICO binary writers, bounded dimensions/quality, JPEG inherited EXIF plus explicit overrides; privacy scrubs before overrides.
- `tabular.worker.ts`: CSV/TSV/JSON/Markdown table conversions and safe serializers.
- `document.worker.ts`: pdf-lib metadata/pages/images/merge/text, PDF.js page rasterization; request responses must be filtered by jobId because PDF.js also posts worker readiness messages.
- `exportFiles.ts`: main-thread native download helper, worker ZIP import/export; streamed actual-byte/CRC checks must precede Blob allocation. Never restore eager JSZip `checkCRC32:true` on imports: it inflates before limits.
- `public/sw.js` and Vite plugin: generated shell precache, opt-in warmed engine cache, same-origin assets/CSP. Build after changing workers or asset paths before E2E.
- `tests/e2e`: real output reinspection, corrupt files, cancellation, formats/media probe, axe/focus/viewports and offline flows. Use `pnpm test:e2e`; `pnpm test` is unit-only.

## Handoff discipline
Root is the sole validating/integrating gate during this user-authorized five-builder session. Builders own bounded files and run focused development checks; root independently runs and inspects the combined gate. Any future model/provider must read TODO and the three ADRs, preserve PRD, and rerun relevant tests rather than infer completeness from this session's report. Keep unverified field/manual/environment claims explicit. Use pnpm 12.15.0; if shell resolves the 11.x fallback, use `pnpm dlx pnpm@12.15.0 <command>`.
