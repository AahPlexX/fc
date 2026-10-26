---
artifact_contract: "ce-handoff/v1"
created_at: "2026-10-25T05:03:58Z"
updated_at: "2026-10-26T02:20:00Z"
title: "OmniConvert corrective production candidate"
summary: "82 unit/75 browser gates, bounded workers, safe focus/preview, explicit PWA control lifecycle, release checker and runbook; permanent corrective CI pending."
keywords: ["omniconvert", "privacy", "workers", "release", "handoff"]
cwd: "/workspace/fc"
repository: "AahPlexX/fc"
branch: "main"
resume_focus: "Record permanent corrective CI in TODO, then follow its conditional source-distribution or hosting-validation next file."
---

Current authority is AGENTS.md, TODO.md, README.md, docs/verification.md and docs/production.md. PRD.md is the unchanged verbatim original brief. Git/CHANGELOG retain older snapshots; previous green CI does not certify newer corrections.

The user requests effective cheap Luna orchestration, root as sole integration/validation gate, no github3, main only, exact pins/pnpm and synchronized documentation. At most3 new files per checkpoint, verified sequentially. This production pass creates only scripts/check-release.mjs (checked before the next file) and docs/production.md. Bounded Luna builders/researchers supplied work; root reproduced/fixed integration issues and independently checked the candidate. No builder is an approval gate.

Current local gate:check/lint39 files,82 unit tests/10 files, build,75 browser scenarios/3 engines/retries0, entry gzip85,868 bytes/150,000 and release:check. Seven corrupted artifact copies were rejected.45 lifecycle stress cases and15 deterministic keyboard stress cases pass. Exact next file is TODO.md to record corrective commit/permanent CI; do not mark complete before that workflow passes.

Load-bearing boundaries:

- conversionRunner.ts is the live execution boundary; mediaAdapter is a separate reusable contract. Media calls share one abort-aware slot, use local file/pipe protocols and terminate engines. Worker clone failures clean up immediately.
- Tables cap input/output64MiB,250k rows/2k columns/2M cells; checks precede rectangular JSON growth. Bounded output parts preserve UTF-8; native JSON parsing/one-row serialization still allocate transiently. Keep safe Papa internal headers, own-property lookup, quoted-record and split-Unicode regressions.
- ZIP File/Blob input stays in the worker and is limited before arrayBuffer; streamed expansion/ratio/CRC and nested-content guards remain. Preview follows target type, treats empty text as loaded and owns URL cleanup.
- Native dialog close restores focus; cleanup may restore manually only when it closes a still-open dialog. The delayed-close keyboard regression failed old code and must remain.
- SW activation performs cache cleanup only. main.tsx waits for activated state and posts OMNICONVERT_CLAIM_CLIENTS; the SW claims in that message event. Never put client claiming back in activation. The held-claim test requires activation before releasing the injected promise, then actual native control.
- Engine URLs include exact core/wrapper versions. Retain old hashed/versioned lazy assets while old clients can remain open. Cache faults preserve network success. Do not force activation or introduce CDN/file-upload fallbacks.
- SW tests use fresh persistent profiles/processes. Ephemeral automation sessions produced captured WebKit internal NetworkProcess errors. Preserve all activation/control/cache assertions and strict injected-write evidence; no retries or suppressed teardown errors. Temporary profiles are removed after shutdown.

History matters: initial da35a79 CI passed82/72; later repeats exposed a genuine delayed-focus race and an activation boundary, followed by automation-context faults. Verification explains the reproductions and corrective tests. Those failures were investigated rather than accepted as flaky passes.

release:check compares pinned/installed engine bytes and notices, validates headers/references/budget, and writes unsigned manifests/checksums. CI adds PR/audit/artifact checks and retains evidence14days; no binary publishing/deployment. Preserve upstream license whitespace/CRLF. LICENSES distinguishes observed npm modules/candidate codecs from unverified exact native corresponding-source. Actual FFmpeg5.1.4/latest core0.12.10 and bounded advisory scope are documented; npm audit does not audit native codec code.

Remaining scope: actual host/HTTPS/rollback behavior, manual accessibility/physical devices, latest-two-stable certification, field CWV/device memory and exact native-source/material coverage. After CI, next file is LICENSES.md for distribution or docs/production.md for hosting. No deployment performed.

Machine-local notes: fallback pnpm11.x; use pnpm dlx pnpm@12.15.0 if necessary. Local WebKit uses supplemental libraries and PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1; real browsers were tested. CI installs --with-deps normally. Use unique Playwright output paths. Scratch research/browser caches are ephemeral; repository docs and retained CI artifacts carry durable evidence. Never upload private files for diagnostics.
