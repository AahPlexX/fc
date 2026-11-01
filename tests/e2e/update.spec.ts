import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const { version: currentVersion } = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
) as { version: string };
const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(currentVersion);
if (!match) throw new Error(`Expected major.minor.patch, received ${currentVersion}`);
const [, major, minor, patch] = match;
if (major === undefined || minor === undefined || patch === undefined) {
  throw new Error(`Unable to derive next patch from ${currentVersion}`);
}
const newerVersion = `${major}.${minor}.${Number(patch) + 1}`;

test("announces a newer deployed version and lets the user defer it", async ({ page }) => {
  let requests = 0;
  await page.route("**/version.json", async (route) => {
    requests += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ version: newerVersion }),
    });
  });
  await page.goto("/");
  const dialog = page.getByRole("dialog", { name: "Update available" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(`Version ${newerVersion} is now available.`);
  const cancel = page.getByRole("button", { name: "Cancel" });
  await expect(cancel).toBeFocused();
  await cancel.click();
  await expect(dialog).toBeHidden();
  const before = requests;
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect.poll(() => requests).toBeGreaterThan(before);
  await expect(dialog).toBeHidden();
});

test("Update reloads and accepts the deployed version after navigation", async ({ page }) => {
  let deployedVersion = newerVersion;
  await page.route("**/version.json", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ version: deployedVersion }),
    });
  });
  await page.goto("/");
  const dialog = page.getByRole("dialog", { name: "Update available" });
  await expect(dialog).toBeVisible();
  deployedVersion = currentVersion;
  const navigation = page.waitForRequest(
    (request) => request.isNavigationRequest() && new URL(request.url()).pathname === "/",
  );
  await page.getByRole("button", { name: "Update" }).click();
  await navigation;
  await page.waitForLoadState("domcontentloaded");
  await expect(dialog).toBeHidden();
});

test("does not announce the current deployed version", async ({ page }) => {
  await page.route("**/version.json", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ version: currentVersion }),
    });
  });
  await page.goto("/");
  await expect(page.getByRole("dialog", { name: "Update available" })).toBeHidden();
});
