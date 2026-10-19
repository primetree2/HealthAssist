import { test, expect, type Page } from "@playwright/test";
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
async function demo(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Explore with fictional data" })
    .click();
  await expect(
    page.getByRole("heading", { name: "A clearer picture, over time." }),
  ).toBeVisible();
}
async function createVault(page: Page) {
  await page.goto("/");
  await page
    .getByLabel("Choose a passphrase")
    .fill("test-only-strong-passphrase");
  await page
    .getByLabel("Confirm passphrase")
    .fill("test-only-strong-passphrase");
  await page.getByLabel("I understand that clearing browser data").check();
  await page.getByRole("button", { name: "Create private journal" }).click();
  await expect(
    page.getByRole("heading", { name: "A clearer picture, over time." }),
  ).toBeVisible();
}
test("demo navigation, history search, questions and responsive layout", async ({
  page,
}) => {
  await demo(page);
  await expect(
    page.getByText("outside report ranges", { exact: true }),
  ).toBeVisible();
  await nav(page, "Your timeline");
  await page
    .getByRole("textbox", { name: "Search timeline" })
    .fill("not-a-match");
  await expect(
    page.getByRole("heading", { name: "No matching entries." }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Search timeline" })
    .fill("Hemoglobin");
  await expect(page.locator(".timeline-item")).toHaveCount(2);
  await nav(page, "Visit notes");
  await expect(page.locator(".questions")).toContainText("3 separate days");
  await nav(page, "Sources & safety");
  await expect(
    page.getByRole("heading", { name: "Explicit unit support" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("check-in stores context and displays emergency warning before save", async ({
  page,
}) => {
  await demo(page);
  await nav(page, "Check-in");
  await page.getByLabel("Date", { exact: true }).fill("2026-01-02");
  await page.getByLabel("Dizziness", { exact: true }).check();
  await page
    .getByLabel("The details you’d like to remember")
    .fill("A test observation <script>alert(1)</script>");
  await page.getByLabel("Yes", { exact: true }).check();
  await expect(
    page.getByText("Contact local emergency services now.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save observation" }).click();
  await expect(
    page.getByRole("heading", { name: "Your health, in sequence." }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Search timeline" })
    .fill("Dizziness");
  await expect(page.locator(".timeline-copy")).toContainText(
    "<script>alert(1)</script>",
  );
});
test("manual lab, duplicate protection, CSV preview and deletion", async ({
  page,
}) => {
  await demo(page);
  await nav(page, "Lab notebook");
  await page.getByLabel("Collection date").fill("2026-01-02");
  await page.getByLabel("Lab / report label").fill("Test lab");
  await page.getByLabel("Reported value", { exact: true }).fill("10");
  await page.getByLabel("Lower bound").fill("12");
  await page.getByLabel("Upper bound").fill("16");
  await page.getByLabel("I checked the test, date").check();
  await page.getByRole("button", { name: "Save result", exact: true }).click();
  await expect(
    page.locator(".result-item").filter({ hasText: "Test lab" }),
  ).toContainText("Below report range");
  await page.getByRole("tab", { name: "Import CSV" }).click();
  await page
    .getByLabel("Paste CSV")
    .fill(
      "date,test,value,unit,low,high,lab\n2026-01-02,Hb,99,mmol/L,12,16,CSV lab",
    );
  await page.getByRole("button", { name: "Validate & preview" }).click();
  await expect(page.locator(".alert.error")).toContainText(
    "Unit not supported",
  );
  await page
    .getByLabel("Paste CSV")
    .fill(
      "date,test,value,unit,low,high,lab\n2026-01-03,Hb,13,g/dL,12,16,CSV lab",
    );
  await page.getByRole("button", { name: "Validate & preview" }).click();
  await expect(page.locator(".csv-preview")).toContainText("1 row ready");
  await page.getByLabel("I verified all rows").check();
  await page.getByRole("button", { name: "Confirm import" }).click();
  await expect(
    page.locator(".result-item").filter({ hasText: "CSV lab" }),
  ).toContainText("Within report range");
  await page
    .getByRole("button", {
      name: "Delete Hemoglobin from 2026-01-03",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Delete permanently" }).click();
  await expect(
    page.locator(".result-item").filter({ hasText: "CSV lab" }),
  ).toHaveCount(0);
});
test("vault persists encrypted data, locks, rejects wrong password, and deletes", async ({
  page,
}) => {
  await createVault(page);
  await nav(page, "Check-in");
  await page.getByLabel("Fatigue", { exact: true }).check();
  await page
    .getByLabel("The details you’d like to remember")
    .fill("sensitive-test-sentinel");
  await page.getByLabel("No — I don’t recognize these signs").check();
  await page.getByRole("button", { name: "Save observation" }).click();
  await expect(
    page.getByRole("heading", { name: "Your health, in sequence." }),
  ).toBeVisible();
  const saved = await page.evaluate(
    async () =>
      await new Promise<unknown>((resolve, reject) => {
        const r = indexedDB.open("health-assist-v2", 1);
        r.onsuccess = () => {
          const db = r.result;
          const q = db.transaction("vault").objectStore("vault").get("journal");
          q.onsuccess = () => {
            resolve(q.result);
            db.close();
          };
        };
        r.onerror = () => reject(r.error);
      }),
  );
  expect(JSON.stringify(saved)).not.toContain("sensitive-test-sentinel");
  await page.getByRole("button", { name: "Lock", exact: true }).click();
  await page.getByLabel("Your passphrase").fill("wrong-passphrase-123");
  await page.getByRole("button", { name: "Unlock journal" }).click();
  await expect(page.locator(".alert.error")).toContainText("Could not unlock");
  await page.getByLabel("Your passphrase").fill("test-only-strong-passphrase");
  await page.getByRole("button", { name: "Unlock journal" }).click();
  await expect(page.locator(".observation-list")).toContainText(
    "sensitive-test-sentinel",
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  await page.getByLabel("Your passphrase").fill("test-only-strong-passphrase");
  await page.getByRole("button", { name: "Unlock journal" }).click();
  await nav(page, "Your data");
  await page.getByRole("button", { name: "Delete browser journal" }).click();
  await page.getByRole("button", { name: "Delete permanently" }).click();
  await expect(
    page.getByRole("heading", { name: "A private space to begin." }),
  ).toBeVisible();
});
test("modal keyboard escape, API metadata, and no health-data requests", async ({
  page,
}) => {
  const unexpected: string[] = [];
  page.on("request", (r) => {
    if (!["GET", "HEAD"].includes(r.method())) unexpected.push(r.url());
  });
  await demo(page);
  await page.getByRole("button", { name: "About Health Assist" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "About Health Assist" }),
  ).toBeFocused();
  const health = await page.request.get("/api/health");
  expect((await health.json()).healthData).toBe("browser-only");
  expect(health.headers()["x-content-type-options"]).toBe("nosniff");
  const catalog = await page.request.get("/api/catalog");
  expect((await catalog.json()).version).toBe("2026-10-19.1");
  expect(unexpected).toEqual([]);
});
