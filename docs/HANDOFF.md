---
artifact_contract: "ce-handoff/v1"
created_at: "2026-10-25T05:03:58Z"
title: "OmniConvert integrated browser workbench"
summary: "Worker conversions, metadata privacy, guarded ZIP archives and offline shell integrated; root browser gates recorded in TODO."
keywords: ["omniconvert", "workers", "privacy", "offline", "handoff"]
cwd: "/workspace/fc"
repository: "AahPlexX/fc"
branch: "main"
resume_focus: "Use the exact remaining verification/release items in TODO; preserve original PRD."
---

This is the user-requested durable handoff for another model/provider. Authoritative context lives in repository files and git, not this chat. Read `AGENTS.md`, `TODO.md`, the three ADRs, and README's supported routes/limitations before changing code. `PRD.md` is the immutable original supplied brief, not a status report.

The user's explicit constraints are pnpm, main branch, bounded file-creation checkpoints (<=3 new files), no file-payload uploads, no github3, co-committed internal documentation, and cost-conscious builders with root as the sole validating gate. Root used five gpt-6-luna builders for bounded implementation, then independently inspected, tested and fixed integration defects. No agent was a release approval gate.

`src/core/conversionRunner.ts` is the live UI execution entry. `App.tsx` controls sequential queue snapshots, cancellation and matching-domain policies. Worker responsibilities and protocols are mapped in AGENTS.md. Important discovered regressions: filter worker responses by jobId (PDF.js posts readiness messages); canonicalize PDF override key casing; scrub orphan Info/XMP objects as well as references; re-encode images before PDF embedding; bound streamed ZIP output instead of eager CRC inflation; restore dialog focus and wrap Tab explicitly; accept pinned core's -1 FFprobe sentinel only alongside validated complete stream JSON.

Implementation includes picker/drop/paste, signature/stream detection, domain target controls, per-item and batch execution, image quality/dimension settings, metadata drawer, safe previews, downloads, collision-safe ZIP, guarded archive import, PDF pages/merge/images, same-origin lazy WASM and a warmed-engine offline shell. README and ADRs define the deliberately narrow behavior (single-page raster export, standard-font document PDF, JPEG EXIF versus other raster metadata, metadata privacy versus redaction).

Verification evidence and unfinished items are in TODO. Tests are source-controlled: `pnpm check`, `pnpm test`, `pnpm build`, `pnpm test:e2e`. Build production artifacts before browser tests. GitHub's pinned Validate workflow runs the same gates including all three browser engines and entry gzip budget. Local preview may still run on port4173; it is machine-local and may be stopped after use.

Machine-local setup note: the original shell resolves pnpm11.25.0; pinned pnpm 12.15.0 was also run successfully via `pnpm dlx pnpm@12.15.0`. WebKit supplemental Debian libraries were downloaded/extracted without root into `/workspace/scratch/browser-libs`, then copied into Playwright's browser-local `sys/lib` directories. Local WebKit runs use `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1` because ldconfig cannot see these user-local libraries; actual launches/conversions are tested. This flag and library work are unnecessary in normal CI after `playwright install --with-deps`. Scratch data and browser caches are ephemeral and not part of the project.

Unverified items must stay explicit: field CWV/75th percentiles, universal <50ms task timing, comprehensive manual WCAG/assistive-tech/physical TV evaluation, latest-two-stable browser certification, cold-engine offline operation, and binary redistribution source/notices (LICENSES.md). No deployment was requested/performed. Do not claim 99% assurance or production certification from automated test counts.

Concurrent main updates through 057f619 were preserved in the merge. Their `exportManager` naming/native download APIs are reused, its ZIP generation delegates to bounded streaming code, and `createBrowserConversionRuntime` delegates to the shared runner. `tests/unit/conversionFlow.test.ts` remains intact; upstream static dialog tests now reflect the consolidated native-dialog UI and effect-owned URL lifecycle. Root local merged evidence:64 unit tests and 36 browser scenarios passed. Permanent Validate run 40164171678 is green on 90173cc, including browser gates and 84,744-byte gzip entry. Final CI URL/status and remaining manual/release scope are in TODO.
