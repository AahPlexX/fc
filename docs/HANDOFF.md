---
artifact_contract: "ce-handoff/v1"
created_at: "2026-10-25T05:03:58Z"
updated_at: "2026-10-26T00:58:00Z"
title: "OmniConvert production-hardening checkpoint"
summary: "82 unit/72 browser gates, bounded resources, safe previews and worker cleanup, versioned/waiting PWA assets, release artifact checker; permanent CI pending."
keywords: ["omniconvert", "privacy", "workers", "release", "handoff"]
cwd: "/workspace/fc"
repository: "AahPlexX/fc"
branch: "main"
resume_focus: "Record permanent candidate CI, then use TODO's exact distribution/hosting follow-up."
---

This is the durable current handoff. Read `AGENTS.md`, `TODO.md`, `README.md`, `docs/verification.md` and `docs/production.md`. Git history/CHANGELOG hold earlier checkpoints; older test counts are historical. `PRD.md` is the unchanged verbatim original product brief, not a progress report.

The user requests cost-effective Luna orchestration, root as sole validation/integration gate, no github3, main only, exact pins/pnpm, at most3 new files per checkpoint, and synchronized internal documentation at every executable commit. Six Luna specialists plus a resumed Luna native researcher supplied bounded work; root reproduced integration defects and independently checked the combined candidate. No builder is a release approval gate. The final production pass creates only `scripts/check-release.mjs` (checked before the next file) and `docs/production.md`.

Current local evidence: strict check/lint39 files;82 unit tests/10 files; production build;72 scenarios in Chromium/Firefox/WebKit, retries0; entry gzip85,760 bytes/150,000; release checker accepts the real artifact and rejects seven damaged copies. Persisted quota-probe JSON proves an injected cache-write rejection plus successful network response in all3 engines; missing injection fails. Permanent candidate commit/CI is recorded in TODO; do not infer current approval from the historical b43e2a1 run. Exact next file while that gate is pending:TODO.md.

Important boundaries:

- `src/core/conversionRunner.ts` is the live UI execution boundary; `mediaAdapter.ts` is a separate tested reusable contract. Media calls share an abort-aware slot; late generations cannot own a subsequent engine. Live probes/transcodes permit only file,pipe protocols. Message clone failures terminate workers and clear timers/listeners immediately.
- Table input/output is64MiB each, with250k rows/2k columns/2M canonical cells. Shape checks precede rectangular JSON allocation. Output is byte-counted in bounded parts; native JSON parsing and a single row can still allocate transiently. Preserve stateful UTF-8, quote/newline carry and safe internal Papa headers; `__proto__` must retain its value, and missing JSON own properties become null.
- ZIP imports post File/Blob to the worker and reject oversized input before arrayBuffer; keep streamed size/ratio/CRC checks. Never restore eager inflate-before-limit CRC behavior. Preview follows target type and distinguishes empty text from loading. Blob URLs/focus are effect-owned.
- SW follows normal waiting lifecycle, isolates named caches and treats runtime cache failures as best-effort. Engine URLs include installed core/wrapper versions. Never restore forced activation/unversioned engine paths. Hosts must retain older hashed/versioned lazy assets while old clients can remain open; a cache cannot recreate a deleted lazy asset.
- `pnpm release:check` validates pins/installed engine bytes/static headers/notices/references/budget and writes unsigned hash manifests/checksums in ignored release-results. CI adds PR/audit/artifact checks and retains verification evidence14days; it does not deploy or publish binary artifacts. Preserve exact upstream legal text whitespace/CRLF; diff checks may exclude the notice text only.

Remaining claims stay explicit: actual host header/HTTPS/rollback behavior, full manual accessibility/physical devices, latest-two-stable browser certification, field CWV and device memory. Native FFmpeg5.1.4 is confirmed in WASM; npm latest core is still0.12.10. The advisory review is bounded, not an exhaustive decoder clearance; npm audit does not cover static native codecs. Candidate codec notices/source links do not establish exact historical corresponding-source coverage. `LICENSES.md` owns that investigation; `docs/production.md` owns host preparation. No deployment performed.

Machine-local reproduction: shell fallback pnpm is11.x; use `pnpm dlx pnpm@12.15.0 <command>` if needed. Local WebKit uses supplemental libraries in Playwright sys/lib and `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1`; actual browsers were exercised. Normal CI installs dependencies with --with-deps and needs no workaround. Use unique Playwright output paths for parallel development. Scratch research/caches are ephemeral; durable evidence is in repository docs and retained CI artifacts. Never transmit private files to a diagnostic service.
