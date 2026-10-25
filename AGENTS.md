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
