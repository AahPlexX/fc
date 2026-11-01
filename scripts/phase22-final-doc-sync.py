from pathlib import Path

RUN_URL = "https://github.com/AahPlexX/fc/actions/runs/41330627014"
RUN_LABEL = "Validate41330627014"
ARTIFACT_ID = "13093491076"
CHECKPOINT = "84d6ea2e5b57d1dbc312644cf8a114ccada54b09"
DEPLOY_ID = "6ae773ecede1a79225dc8053"


def replace(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"expected text missing in {path}: {old[:160]!r}")
    p.write_text(text.replace(old, new, 1))


replace(
    "TODO.md",
    "**IN VALIDATION — Phase22 device/viewport-agnostic responsive hardening (2026-11-01).** OmniConvert is `1.0.1`. A RED Chromium regression proved the prior rem-scaled `20rem` minimum widened a 320 CSS-pixel workspace to 640 CSS pixels at 200% text sizing. The implementation removes that viewport floor, makes queue actions and long content container-safe, bounds controls/modal actions, and keeps metadata/preview dialogs usable in short landscape layouts. `tests/e2e/responsive.spec.ts` covers 320–3840px portrait/landscape viewports, 200% text sizing, long filenames, >=24 CSS-pixel visible targets, preview containment and compact metadata dialogs across Chromium/Firefox/WebKit. The integration gate passed zero high-severity npm advisories, lint/typecheck, 115 unit tests, build/release checks, 14 negative artifact cases, 9/9 focused responsive scenarios and 99/99 complete browser scenarios. Feature commit: `70f8626b59ba69900eb1ab7cdf5ea7c7c9b4a8eb`. Permanent pinned `Validate` is still required before this phase may be marked COMPLETE.",
    f"**COMPLETE — Phase22 device/viewport-agnostic responsive hardening, automated scope (2026-11-01).** OmniConvert is `1.0.1`. A RED Chromium regression proved the prior rem-scaled `20rem` minimum widened a 320 CSS-pixel workspace to 640 CSS pixels at 200% text sizing. The implementation removes that viewport floor, makes queue actions and long content container-safe, bounds controls/modal actions, and keeps metadata/preview dialogs usable in short landscape layouts. `tests/e2e/responsive.spec.ts` covers 320–3840px portrait/landscape viewports, 200% text sizing, long filenames, >=24 CSS-pixel visible targets, preview containment and compact metadata dialogs across Chromium/Firefox/WebKit. Feature commit `70f8626b59ba69900eb1ab7cdf5ea7c7c9b4a8eb` is certified by tree-equivalent docs-current checkpoint `{CHECKPOINT}`: [{RUN_LABEL}]({RUN_URL}) passed with zero registry advisories, lint/typecheck, 115/115 unit tests, production build/release checks, 14/14 negative artifact cases, and all 99/99 Playwright scenarios across Chromium 156, Firefox 157 and WebKit 27.2, including the 9/9 focused responsive scenarios. Retained `browser-verification` artifact ID `{ARTIFACT_ID}` contains 22 files and is retained for 14 days."
)
replace(
    "TODO.md",
    "Netlify production project `omniconverttool` now has a ready production deploy built from branch `main` at exact feature commit `70f8626b59ba69900eb1ab7cdf5ea7c7c9b4a8eb`; Netlify reports 12 header rules processed without errors. Next environment-specific action: run `pnpm release:verify-host -- https://omniconverttool.netlify.app` against the exact release manifest. This full byte/header/MIME/cache/404 contract, manual accessibility/physical-device evaluation, field metrics and broad real-hardware coverage remain UNVERIFIED. For a bad published Netlify release, fix forward by reverting/correcting source and redeploying; do not force old clients onto another service worker.",
    f"Netlify production project `omniconverttool` has a ready production deploy `{DEPLOY_ID}` built from branch `main` at exact checkpoint `{CHECKPOINT}`; Netlify reports 12 header rules processed without errors. Next environment-specific action: run `pnpm release:verify-host -- https://omniconverttool.netlify.app` against the exact release manifest. This full byte/header/MIME/cache/404 contract, manual accessibility/physical-device evaluation, field metrics and broad real-hardware coverage remain UNVERIFIED. Automated browser coverage is strong regression evidence, not proof of identical experience on every physical device or complete WCAG conformance. For a bad published Netlify release, fix forward by reverting/correcting source and redeploying; do not force old clients onto another service worker."
)
replace(
    "TODO.md",
    "| 22 | Device/viewport-agnostic responsive hardening | IN VALIDATION | `1.0.1`; RED 320px/200%-text overflow reproduced; 115 unit/99 browser/14 negative artifact cases plus 9/9 focused responsive scenarios pass; feature `70f8626`; permanent Validate pending. Netlify production deploy at the feature commit is ready; full host verifier/manual/physical-device/field evidence remains open. |",
    f"| 22 | Device/viewport-agnostic responsive hardening | COMPLETE (automated scope) | `1.0.1`; RED 320px/200%-text overflow reproduced; [{RUN_LABEL}]({RUN_URL}) green on tree-equivalent `{CHECKPOINT}` with zero advisories, 115 unit/99 browser/14 negative artifact cases and 9/9 focused responsive scenarios; artifact `{ARTIFACT_ID}` retained. Netlify deploy `{DEPLOY_ID}` is ready; full host verifier/manual/physical-device/field evidence remains open. |"
)

replace(
    "docs/HANDOFF.md",
    'updated_at: "2026-11-01T17:10:00Z"',
    'updated_at: "2026-11-01T17:20:00Z"'
)
replace(
    "docs/HANDOFF.md",
    'summary: "Phase22 hardens reflow, text resizing, long-content actions and compact dialogs across three browser engines; Netlify production is deployed at the feature commit, with permanent Validate and full host-contract verification still gated."',
    'summary: "Phase22 1.0.1 responsive hardening is complete for automated scope with permanent Validate green across Chromium, Firefox and WebKit; Netlify production is ready, while full host-contract, manual accessibility, physical-device and field evidence remain separate."'
)
replace(
    "docs/HANDOFF.md",
    'resume_focus: "Require permanent Validate for the Phase22 docs-current checkpoint, then run release:verify-host against https://omniconverttool.netlify.app; keep manual physical-device/accessibility and field evidence explicitly separate."',
    'resume_focus: "Run release:verify-host against https://omniconverttool.netlify.app, then continue product work while keeping manual physical-device/accessibility and field evidence explicitly separate."'
)
replace(
    "docs/HANDOFF.md",
    "Current authority is AGENTS.md, TODO.md, README.md, docs/verification.md and docs/production.md. PRD.md is the unchanged verbatim original brief. Phase22 feature commit is `70f8626b59ba69900eb1ab7cdf5ea7c7c9b4a8eb`; its integration gate is green but permanent pinned Validate is still required before COMPLETE. Netlify production deploy `6ae6a7b2986ce8a32438a28d` is ready from that exact feature commit. Previous green CI does not certify newer corrections.",
    f"Current authority is AGENTS.md, TODO.md, README.md, docs/verification.md and docs/production.md. PRD.md is the unchanged verbatim original brief. Phase22 feature commit `70f8626b59ba69900eb1ab7cdf5ea7c7c9b4a8eb` is certified by tree-equivalent checkpoint `{CHECKPOINT}` through [{RUN_LABEL}]({RUN_URL}). Netlify production deploy `{DEPLOY_ID}` is ready from that exact checkpoint. Previous green CI does not certify newer corrections."
)
replace(
    "docs/HANDOFF.md",
    "The Phase22 integration gate passed 115/115 unit tests, 14/14 negative artifact cases, 9/9 focused responsive scenarios and 99/99 full Playwright scenarios across Chromium/Firefox/WebKit, with no high-severity npm advisories. Netlify production deploy `6ae6a7b2986ce8a32438a28d` is ready from exact feature commit `70f8626`; its 12 header rules processed without errors. Permanent pinned Validate and the repository's full `release:verify-host` HTTPS byte/header/MIME/cache/404 contract remain separate gates; physical-device/manual accessibility and field evidence remain explicitly unverified.",
    f"Phase22 is COMPLETE for automated scope. [{RUN_LABEL}]({RUN_URL}) passed at tree-equivalent checkpoint `{CHECKPOINT}` with zero registry advisories, lint/typecheck, 115/115 unit tests, production build/release checks, 14/14 negative artifact cases and 99/99 full Playwright scenarios across Chromium 156, Firefox 157 and WebKit 27.2; those include 9/9 focused responsive scenarios. Retained browser evidence artifact ID `{ARTIFACT_ID}` contains 22 files. Netlify production deploy `{DEPLOY_ID}` is ready from `{CHECKPOINT}` and its 12 header rules processed without errors. The repository's full `release:verify-host` HTTPS byte/header/MIME/cache/404 contract, physical-device/manual accessibility and field evidence remain explicitly unverified."
)

replace(
    "docs/verification.md",
    "The RED case first failed with document `scrollWidth` 640 vs viewport `innerWidth` 320. After the fix, the integration gate passed 115/115 unit tests, 14/14 negative artifact cases, 9/9 focused responsive cases and 99/99 complete Playwright scenarios across Chromium 156, Firefox 157 and WebKit 27.2; lint/typecheck, build/release checks and the high-severity npm audit also passed. Netlify production deploy `6ae6a7b2986ce8a32438a28d` is ready from exact feature commit `70f8626b59ba69900eb1ab7cdf5ea7c7c9b4a8eb` with 12 header rules processed without errors. Permanent pinned Validate and full `release:verify-host` verification of the HTTPS production origin remain separate gates. Automated browser coverage does not establish complete manual WCAG conformance or universal physical-device equivalence.",
    f"The RED case first failed with document `scrollWidth` 640 vs viewport `innerWidth` 320. After the fix, the integration gate passed 115/115 unit tests, 14/14 negative artifact cases, 9/9 focused responsive cases and 99/99 complete Playwright scenarios across Chromium 156, Firefox 157 and WebKit 27.2. Permanent [{RUN_LABEL}]({RUN_URL}) independently passed on tree-equivalent docs-current checkpoint `{CHECKPOINT}` with zero registry advisories, lint/typecheck, production build/release checks and the same 115 unit / 14 negative / 99 browser totals; retained `browser-verification` artifact ID `{ARTIFACT_ID}` contains 22 files. Netlify production deploy `{DEPLOY_ID}` is ready from exact checkpoint `{CHECKPOINT}` with 12 header rules processed without errors. Full `release:verify-host` verification of the HTTPS production origin, manual WCAG evaluation, screen-reader/physical-device testing and field evidence remain separate UNVERIFIED gates. Automated browser coverage does not establish universal physical-device equivalence."
)

replace(
    "docs/production.md",
    "Updated 2026-11-01. This is the portable static-hosting and production-operations procedure. Netlify project `omniconverttool` now has a ready production deploy (`6ae6a7b2986ce8a32438a28d`) built from Phase22 feature commit `70f8626b59ba69900eb1ab7cdf5ea7c7c9b4a8eb`. The repository's full `release:verify-host` contract has not yet been run against that HTTPS origin, so host byte/header/MIME/cache/404 conformance remains UNVERIFIED. TODO records remaining release criteria and docs/verification.md records measured scope. Artifact checks do not establish legal compliance, full accessibility conformance or field performance.",
    f"Updated 2026-11-01. This is the portable static-hosting and production-operations procedure. Phase22 automated scope is certified by [{RUN_LABEL}]({RUN_URL}) on tree-equivalent checkpoint `{CHECKPOINT}`. Netlify project `omniconverttool` has ready production deploy `{DEPLOY_ID}` built from that exact checkpoint. The repository's full `release:verify-host` contract has not yet been run against that HTTPS origin, so host byte/header/MIME/cache/404 conformance remains UNVERIFIED. TODO records remaining release criteria and docs/verification.md records measured scope. Artifact checks do not establish legal compliance, full accessibility conformance or field performance."
)
replace(
    "docs/production.md",
    "Preferred production host: Netlify project `omniconverttool`. Git deployment is now active: production deploy `6ae6a7b2986ce8a32438a28d` is `ready`, branch `main`, exact commit `70f8626b59ba69900eb1ab7cdf5ea7c7c9b4a8eb`, and Netlify reports 12 header rules processed without errors. This deployment metadata does not substitute for the repository's full `release:verify-host` response/body verification.",
    f"Preferred production host: Netlify project `omniconverttool`. Git deployment is active: production deploy `{DEPLOY_ID}` is `ready`, branch `main`, exact checkpoint `{CHECKPOINT}`, and Netlify reports 12 header rules processed without errors. This deployment metadata does not substitute for the repository's full `release:verify-host` response/body verification."
)
replace(
    "docs/production.md",
    "Phase22 integration passed the 9/9 focused responsive matrix and all 99/99 browser scenarios across Chromium/Firefox/WebKit. Netlify production deploy `6ae6a7b2986ce8a32438a28d` is ready at exact feature commit `70f8626` with 12 header rules processed. Permanent pinned Validate and full `release:verify-host` remain required before closing their respective gates; manual physical-device/accessibility and field checks remain explicitly separate.",
    f"Phase22 integration passed the 9/9 focused responsive matrix and all 99/99 browser scenarios across Chromium/Firefox/WebKit. Permanent [{RUN_LABEL}]({RUN_URL}) passed at tree-equivalent checkpoint `{CHECKPOINT}` with zero registry advisories, 115 unit tests and 14 negative artifact cases; evidence artifact `{ARTIFACT_ID}` is retained. Netlify production deploy `{DEPLOY_ID}` is ready at `{CHECKPOINT}` with 12 header rules processed. Full `release:verify-host` remains required for the live-origin contract; manual physical-device/accessibility and field checks remain explicitly separate."
)

replace(
    "CHANGELOG.md",
    "- Netlify production deploy `6ae6a7b2986ce8a32438a28d` is ready from exact feature commit `70f8626`; full `release:verify-host` verification remains separate.",
    f"- Netlify production deploy `{DEPLOY_ID}` is ready from exact checkpoint `{CHECKPOINT}` with 12 header rules processed; full `release:verify-host` verification remains separate.\n- Permanent [{RUN_LABEL}]({RUN_URL}) passed on tree-equivalent `{CHECKPOINT}` with zero registry advisories, 115 unit tests, 14 negative artifact cases, and 99/99 Chromium/Firefox/WebKit browser scenarios; retained browser artifact ID `{ARTIFACT_ID}`."
)
