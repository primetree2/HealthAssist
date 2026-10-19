import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
async function nav(page: Page, name: string) {
  if (
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .isVisible()
  )
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .click();
  await page.getByRole("button", { name, exact: true }).first().click();
}
test("encrypted backup restores only after correct passphrase and confirmation", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Choose a passphrase")
    .fill("backup-test-passphrase-123");
  await page
    .getByLabel("Confirm passphrase")
    .fill("backup-test-passphrase-123");
  await page.getByLabel("I understand that clearing browser data").check();
  await page.getByRole("button", { name: "Create private journal" }).click();
  await expect(
    page.getByRole("heading", { name: "A clearer picture, over time." }),
  ).toBeVisible();
  await nav(page, "Check-in");
  await page.getByLabel("Fatigue", { exact: true }).check();
  await page
    .getByLabel("The details you’d like to remember")
    .fill("backup-test-sentinel");
  await page.getByLabel("No — I don’t recognize these signs").check();
  await page.getByRole("button", { name: "Save observation" }).click();
  await expect(
    page.getByRole("heading", { name: "Your health, in sequence." }),
  ).toBeVisible();
  await nav(page, "Your data");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export encrypted backup" }).click();
  const download = await downloadPromise;
  const path = await download.path();
  expect(path).toBeTruthy();
  const file = await readFile(path!);
  expect(file.toString()).not.toContain("backup-test-sentinel");
  await nav(page, "Your timeline");
  await page.getByRole("button", { name: /Delete Fatigue from/ }).click();
  await page.getByRole("button", { name: "Delete permanently" }).click();
  await expect(
    page.getByRole("heading", { name: "Nothing recorded yet." }),
  ).toBeVisible();
  await nav(page, "Your data");
  await page.getByLabel("Choose backup JSON").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: file,
  });
  await page
    .getByLabel("Backup’s original passphrase")
    .fill("wrong-backup-passphrase");
  await page.getByLabel("Replace all entries in this journal").check();
  await page.getByRole("button", { name: "Unlock & replace journal" }).click();
  await expect(page.locator(".alert.error")).toContainText("Could not unlock");
  await page
    .getByLabel("Backup’s original passphrase")
    .fill("backup-test-passphrase-123");
  await page.getByRole("button", { name: "Unlock & replace journal" }).click();
  await expect(page.getByLabel("Backup’s original passphrase")).toHaveCount(0);
  await nav(page, "Your timeline");
  await expect(page.locator(".timeline-copy")).toContainText(
    "backup-test-sentinel",
  );
});
