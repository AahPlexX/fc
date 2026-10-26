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
- `tabular.worker.ts`: accepts File/Blob input and returns encoded Blob results (no large text replies); CSV/TSV/JSON/Markdown conversions and safe serializers stay off main. The pure string API remains for unit/compatibility use.
- `document.worker.ts`: pdf-lib metadata/pages/images/merge/text, PDF.js page rasterization; request responses must be filtered by jobId because PDF.js also posts worker readiness messages.
- `exportFiles.ts`: main-thread native download helper, worker ZIP import/export; streamed actual-byte/CRC checks must precede Blob allocation. Never restore eager JSZip `checkCRC32:true` on imports: it inflates before limits.
- `public/sw.js` and Vite plugin: generated shell precache, opt-in warmed engine cache, same-origin assets/CSP. Build after changing workers or asset paths before E2E.
- `tests/e2e`: real output reinspection, corrupt files, cancellation, formats/media probe, axe/focus/viewports and offline flows. Use `pnpm test:e2e`; `pnpm test` is unit-only.

## Handoff discipline
Root is the sole validating/integrating gate during this user-authorized multi-builder session. Builders own bounded files and run focused development checks; root independently runs and inspects the combined gate. Any future model/provider must read TODO and the three ADRs, preserve PRD, and rerun relevant tests rather than infer completeness from this session's report. Keep unverified field/manual/environment claims explicit. Use pnpm 12.15.0; if shell resolves the 11.x fallback, use `pnpm dlx pnpm@12.15.0 <command>`.

## Continuation checkpoint
Read `docs/verification.md` for root-confirmed82/72 gates, lab scopes and unsupported measurements. Live media calls share an abort-aware slot; adapter generations must not let late creation/loading clear a subsequent engine. ZIP export uses the same active-operation/cancel UI and retains a repeat-download Blob until cleared/replaced. Metadata inspection has a separate abort controller and explicit loading/error state. SW cache IDs include engine content, not just filenames. CI browser evidence is retained 14 days; do not treat a missing measurement as zero or infer field INP from all EventTiming events.

Pinned Papa 5.7.0 ParserHandle supplies CSV header/logical-record carry while one native TextDecoder preserves UTF-8 across byte slices. Do not revert to independent FileReader.readAsText slices (corrupts boundary characters), drop the Unicode regression, or let worker progress messages settle the request as results. PDF date inspection entries remain read-only.

Keep the incremental, quote-aware first-record separator sniff: Papa5.7 newline guessing sees only1MiB and can misclassify a longer header. Header capture waits for nonempty fields. The regression covers LF/CRLF/CR and split CRLF; do not treat the64MiB input cap as an output-expansion bound.

Historical passes do not certify later source. The current82-unit/75-browser local candidate includes focus and activation corrections; TODO carries the exact corrective commit/CI and resume point.

## Production pass boundary (2026-10-26)
Read docs/production.md before hosting/updating. Engine paths include exact package versions; do not restore unversioned URLs or forced SW activation. Retain prior hashed/versioned lazy assets for live clients. Live media probes/conversions allow only file,pipe protocols. ZIP worker accepts File/Blob with a size guard before arrayBuffer. Table limits cover all API paths; native JSON parse remains transient-memory dependent, but shape checks precede canonical expansion. Papa internal headers use a safe prefix so __proto__ values survive; missing JSON own properties are null.

Run release:check after build; it verifies copied FFmpeg bytes against installed packages and writes unsigned manifests/checksums. CI evidence also includes audit JSON. Preserve upstream license bytes, including CRLF/trailing whitespace; diff --check may exclude public/THIRD_PARTY_NOTICES.txt for those verbatim texts only. No package pins or PRD bytes changed. Root is sole gate; builders supply bounded work, not approvals.

Dialog invariant: native close restores focus synchronously. Cleanup may restore manually only if it closes a still-open dialog; unconditional later focus steals rapid keyboard navigation. Keep the delayed-close regression (native notification replayed after Tab) and its assertions. This is a current source follow-up to the historical initial production CI success; TODO tracks its final gate.

SW activation invariant: cache cleanup gates activation. main.tsx requests initial control with OMNICONVERT_CLAIM_CLIENTS only after the worker is activated; the SW claims in that message event. Never move clients.claim back into activation. Preserve the held-claim test: activation must complete before releasing the injected promise, then actual client control must succeed. This pins an API dependency boundary without claiming a proven browser implementation bug.

PWA verification uses a fresh persistent browser profile/process per service-worker scenario; ephemeral automation sessions exposed WebKit internal NetworkProcess errors. Keep real activation/control/cache assertions and strict injected-write proof; do not add retries, swallow teardown errors or substitute missing observations for passes. Profiles are owned temporary directories removed after shutdown.
