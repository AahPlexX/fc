# Changelog

All notable OmniConvert changes follow Keep a Changelog semantics.

## [Unreleased]

### Added
- Phase 12 integrated browser conversion runtime: AbortController-backed orchestration, disposable image/tabular/PDF module workers, lazy same-origin ffmpeg.wasm core loading, real Convert/Cancel/Download controls, sequential Convert All, completed-output ZIP export, Clear Completed, executable-target filtering, `aria-busy`, and live conversion telemetry; full CI verification is pending.
- Phase 12 second red-first contract for real runtime dispatch and loading/converting telemetry.
- Phase 12 conversion/export core: executable-domain planning, invalid/unimplemented route rejection, deterministic FFmpeg recipes, metadata strip/override flags, stable converted filenames, collision-safe archive names, lazy JSZip DEFLATE generation, and explicit Blob URL download cleanup.
- Phase 11 metadata/preview workbench implementation and prior verified conversion-engine foundations.
- `PRD.md` preserving the complete original user-supplied OmniConvert brief verbatim as an immutable baseline.

### Changed
- `MediaEngineLoadConfig.classWorkerURL` is optional for the single-thread core; same-origin validation still applies to every supplied FFmpeg asset URL.
- The UI now exposes only currently executable targets while preserving the broader semantic compatibility matrix and original PRD requirements for later completion phases.
- Phase 12 pure core is CI-verified on run 40163096278; runtime-dispatch RED is verified on run 40163277102.
- Phase 11 is CI-verified on run 40162718916.
- Remaining PRD gaps are explicitly tracked instead of being hidden behind broad compatibility options.

## [1.0.0] - 2026-10-23

### Added
- Approved OmniConvert PRD baseline supplied for implementation.
