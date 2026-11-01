import json
import os
from pathlib import Path

REPORT = Path("release-results/host-verification.json")
report = json.loads(REPORT.read_text())
if report.get("format") != "omniconvert-host-verification/v1":
    raise SystemExit("unexpected host verification report format")
if report.get("origin") != "https://omniconverttool.netlify.app":
    raise SystemExit("unexpected verified origin")
if report.get("loopbackTest") is not False:
    raise SystemExit("live verification must not be loopback")
if report.get("artifactTrackedDirty") is not False:
    raise SystemExit("host verification artifact must come from a clean checkout")

run_id = os.environ["GITHUB_RUN_ID"]
run_url = f"https://github.com/AahPlexX/fc/actions/runs/{run_id}"
revision = report["artifactRevision"]
verified_at = report["verifiedAt"]
asset_count = report["verifiedAssets"]
missing_count = report["missingAssetChecks"]


def replace(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text()
    if old not in text:
        raise SystemExit(f"expected text missing in {path}: {old[:180]!r}")
    p.write_text(text.replace(old, new, 1))


verified = (
    f"Live-origin verification [HostVerify{run_id}]({run_url}) passed against "
    f"`https://omniconverttool.netlify.app` using clean artifact revision `{revision}`: "
    f"{asset_count} distributable artifacts matched local SHA-256/length plus the required "
    f"security, MIME and cache contract, and all {missing_count} randomized missing-asset probes "
    "returned real 404 responses over verified HTTPS/TLS."
)

replace(
    "TODO.md",
    "Netlify production project `omniconverttool` has a ready production deploy `6ae773ecede1a79225dc8053` built from branch `main` at exact checkpoint `84d6ea2e5b57d1dbc312644cf8a114ccada54b09`; Netlify reports 12 header rules processed without errors. Next environment-specific action: run `pnpm release:verify-host -- https://omniconverttool.netlify.app` against the exact release manifest. This full byte/header/MIME/cache/404 contract, manual accessibility/physical-device evaluation, field metrics and broad real-hardware coverage remain UNVERIFIED. Automated browser coverage is strong regression evidence, not proof of identical experience on every physical device or complete WCAG conformance. For a bad published Netlify release, fix forward by reverting/correcting source and redeploying; do not force old clients onto another service worker.",
    f"Netlify production project `omniconverttool` is active on branch `main`. {verified} Manual accessibility/physical-device evaluation, current/previous stable-browser certification, field metrics and broad real-hardware coverage remain UNVERIFIED. Automated browser coverage plus the live-origin contract are strong evidence, not proof of identical experience on every physical device or complete WCAG conformance. For a bad published Netlify release, fix forward by reverting/correcting source and redeploying; do not force old clients onto another service worker."
)
replace(
    "TODO.md",
    "full host verifier/manual/physical-device/field evidence remains open.",
    "live host verifier is green; manual/physical-device/stable-browser/field evidence remains open."
)

handoff = Path("docs/HANDOFF.md")
text = handoff.read_text()
lines = text.splitlines()
for i, line in enumerate(lines):
    if line.startswith('updated_at: '):
        lines[i] = f'updated_at: "{verified_at}"'
    elif line.startswith('summary: '):
        lines[i] = 'summary: "Phase22 1.0.1 responsive hardening and the Netlify live-origin artifact/header/MIME/cache/404 contract are verified; manual accessibility, physical-device, stable-browser and field evidence remain separate."'
    elif line.startswith('resume_focus: '):
        lines[i] = 'resume_focus: "Continue product work from Phase22 1.0.1 while keeping manual assistive-technology/physical-device, stable-browser, field and native-source evidence explicitly separate."'
handoff.write_text("\n".join(lines) + ("\n" if text.endswith("\n") else ""))
replace(
    "docs/HANDOFF.md",
    "The repository's full `release:verify-host` HTTPS byte/header/MIME/cache/404 contract, physical-device/manual accessibility and field evidence remain explicitly unverified.",
    f"{verified} Physical-device/manual accessibility, current/previous stable-browser certification and field evidence remain explicitly unverified."
)

replace(
    "docs/verification.md",
    "The release checker/runbook cover prepared static hosting, not a deployed host. Actual HTTPS/header/MIME/cache/rollback behavior, complete manual accessibility/physical devices, stable-browser certification, field metrics and device memory remain unverified.",
    f"The release checker/runbook is now exercised against the deployed Netlify origin. {verified} Staged old-client/rollback drills, complete manual accessibility/physical devices, current/previous stable-browser certification, field metrics and device-memory characterization remain unverified."
)
with Path("docs/verification.md").open("a") as f:
    f.write(
        "\n\n## Phase22 live-origin verification — 2026-11-01\n"
        + verified
        + " The verifier sent no user-file payloads and used its inherited curl proxy/CA configuration without disabling certificate validation. This closes the automated live-host byte/header/MIME/cache/404 gate only; it does not establish manual WCAG conformance, universal physical-device equivalence, rollback behavior or field performance.\n"
    )

replace(
    "docs/production.md",
    "The repository's full `release:verify-host` contract has not yet been run against that HTTPS origin, so host byte/header/MIME/cache/404 conformance remains UNVERIFIED.",
    f"{verified}"
)
replace(
    "docs/production.md",
    "The production Netlify deploy exists and is ready, but the full host-verifier check remains pending in this checkpoint.",
    f"{verified}"
)
replace(
    "docs/production.md",
    "HTTPS configuration and any HSTS policy belong to the selected host; they have not been validated here.",
    "The HTTPS endpoint and required artifact response contract are verified by the live-host check above. Any separate HSTS policy remains a host-operations decision and was not added or certified by this phase."
)
replace(
    "docs/production.md",
    "Full `release:verify-host` remains required for the live-origin contract; manual physical-device/accessibility and field checks remain explicitly separate.",
    f"{verified} Manual physical-device/accessibility, stable-browser and field checks remain explicitly separate."
)

replace(
    "CHANGELOG.md",
    "- Netlify production deploy `6ae773ecede1a79225dc8053` is ready from exact checkpoint `84d6ea2e5b57d1dbc312644cf8a114ccada54b09` with 12 header rules processed; full `release:verify-host` verification remains separate.",
    f"- Netlify production is active from `main`; {verified}"
)
