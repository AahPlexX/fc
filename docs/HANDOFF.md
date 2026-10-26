---
artifact_contract: "ce-handoff/v1"
created_at: "2026-10-25T05:03:58Z"
updated_at: "2026-10-26T15:27:19Z"
title: "OmniConvert verified source-delivery checkpoint"
summary: "Phase18 adds verified87-file ExifReader source delivery and14 negative artifact cases;82 unit/78 browser/14 negative artifact cases pass; source5ea6d5a/Validate40348252463 green; FFmpeg/host/manual/field gates remain open."
keywords: ["omniconvert", "privacy", "workers", "release", "handoff"]
cwd: "/workspace/fc"
repository: "AahPlexX/fc"
branch: "main"
resume_focus: "Read TODO; host validation needs an HTTPS origin, native source validation needs new build records, and manual/device checks need those environments."
---

Current authority is AGENTS.md, TODO.md, README.md, docs/verification.md and docs/production.md. PRD.md is the unchanged verbatim original brief. Git/CHANGELOG retain older snapshots; previous green CI does not certify newer corrections.

The user requests effective cheap Luna orchestration, root as sole integration/validation gate, no github3, main only, exact pins/pnpm and synchronized documentation. At most3 new files per checkpoint, verified sequentially. This production pass creates only scripts/check-release.mjs (checked before the next file) and docs/production.md. Bounded Luna builders/researchers supplied work; root reproduced/fixed integration issues and independently checked the candidate. No builder is an approval gate.

Phase18 current state: same-origin sources.html and an87-file ExifReader ZIP are generated from the pinned installed package, with a production footer link opening a new tab. Root verified the primary tarball, each ZIP member and identical timezone builds. Check/build/82 unit/78 browser/14 negative artifact checks and two timezone checks pass; [permanent Validate40348252463](https://github.com/AahPlexX/fc/actions/runs/40348252463) is green on source5ea6d5a. New file:scripts/test-release.mjs (the only Phase18 new file). Package scripts/CI add release:test; pins/lockfile/PRD remain unchanged. Entry gzip85,926 bytes;36 artifact files.

Read LICENSES for source hashes/provenance and docs/verification.md for reproduced checker defects. Keep native Readable wrapping for JSZip's legacy stream, UTC timestamp comparison, bounded source reads, exact entry/byte/CRC/type checks and14 expected negative rejections. Run release:check/release:test sequentially; they share manifest outputs. No source page/archive is precached. The production-only footer link preserves files; development mode does not expose nonexistent build artifacts.

Load-bearing boundaries:

- conversionRunner.ts is the live execution boundary; mediaAdapter is a separate reusable contract. Media calls share one abort-aware slot, use local file/pipe protocols and terminate engines. Worker clone failures clean up immediately.
- Tables cap input/output64MiB,250k rows/2k columns/2M cells; checks precede rectangular JSON growth. Bounded output parts preserve UTF-8; native JSON parsing/one-row serialization still allocate transiently. Keep safe Papa internal headers, own-property lookup, quoted-record and split-Unicode regressions.
- ZIP File/Blob input stays in the worker and is limited before arrayBuffer; streamed expansion/ratio/CRC and nested-content guards remain. Preview follows target type, treats empty text as loaded and owns URL cleanup.
- Native dialog close restores focus; cleanup may restore manually only when it closes a still-open dialog. The delayed-close keyboard regression failed old code and must remain.
- SW activation performs cache cleanup only. main.tsx posts OMNICONVERT_CLAIM_CLIENTS after registration.ready; its handler waits on worker-local activated state before claiming. Page-side state can remain outdated during overlapping navigation. Never put client claiming back in activation. The held-claim test requires activation before releasing the injected promise, then actual native control.
- Engine URLs include exact core/wrapper versions. Retain old hashed/versioned lazy assets while old clients can remain open. Cache faults preserve network success. Do not force activation or introduce CDN/file-upload fallbacks.
- SW tests use fresh persistent profiles/processes. Ephemeral automation sessions produced captured WebKit internal NetworkProcess errors. Preserve all activation/control/cache assertions and strict injected-write evidence; no retries or suppressed teardown errors. Temporary profiles are removed after shutdown.

History matters: initial da35a79 CI passed82/72; later repeats exposed a genuine delayed-focus race and an activation boundary, followed by automation-context faults. Verification explains the reproductions and corrective tests. Those failures were investigated rather than accepted as flaky passes.

release:check compares pinned/installed engine bytes and notices, validates headers/references/budget, and writes unsigned manifests/checksums. CI adds PR/audit/artifact checks and retains evidence14days; no binary publishing/deployment. Preserve upstream license whitespace/CRLF. LICENSES distinguishes observed npm modules/candidate codecs from unverified exact native corresponding-source. Actual FFmpeg5.1.4/latest core0.12.10 and bounded advisory scope are documented; npm audit does not audit native codec code.

Remaining scope: actual host/HTTPS/rollback behavior, manual accessibility/physical devices, latest-two-stable certification, field CWV/device memory and exact native-source/material coverage. Exact next file is docs/production.md once an HTTPS origin is known. Native source work in LICENSES.md requires new build records or a controlled reconstruction; repeating this bounded search is not the next step. No deployment performed.

Machine-local notes: fallback pnpm11.x; use pnpm dlx pnpm@12.15.0 if necessary. Local WebKit uses supplemental libraries and PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1; real browsers were tested. CI installs --with-deps normally. Use unique Playwright output paths. Scratch research/browser caches are ephemeral; repository docs and retained CI artifacts carry durable evidence. Never upload private files for diagnostics.

Latest historical green source:a387e13/Validate40258988170 (82/75). Follow-up fixes make both audio players and a byte-identical preview download keyboard reachable. A later full gate exposed a stale page-side worker snapshot;500ms of activation work reproduced5/5 WebKit failures despite worker-side activated. The worker now owns readiness;18 held-claim/update cases pass across3 engines. The strengthened update regression requires activated at every native claim, actual page control, waiting-client protection and old/new cache outcomes. Final root82/75 gate and Validate40261796547 are green on0c37b2d. PRD, package pins and the two-new-file count remain unchanged.
