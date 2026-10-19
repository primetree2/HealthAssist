import { test, expect, type Page } from "@playwright/test";
async function openMenu(page: Page) {
  const menu = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  if (await menu.isVisible()) await menu.click();
}
async function closeMenu(page: Page) {
  const close = page.locator(".mobile-close");
  if (await close.isVisible()) await close.click();
}
test("aurora is decorative, pausable, reduced-motion aware and absent from forms", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await expect(page.locator(".aurora--welcome")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  expect(
    await page
      .locator(".aurora__ribbon")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("aurora-drift");
  await openMenu(page);
  await page.getByRole("button", { name: "Pause aurora", exact: true }).click();
  await expect(page.locator(".app-shell")).toHaveAttribute(
    "data-aurora-paused",
    "true",
  );
  expect(
    await page
      .locator(".aurora__ribbon")
      .first()
      .evaluate((el) => getComputedStyle(el).animationPlayState),
  ).toBe("paused");
  await page
    .getByRole("button", { name: "Resume aurora", exact: true })
    .click();
  await closeMenu(page);
  await page
    .getByRole("button", { name: "Explore with fictional data" })
    .click();
  await expect(page.locator(".aurora--card")).toHaveCount(1);
  await openMenu(page);
  await page.getByRole("button", { name: "Lab notebook", exact: true }).click();
  await expect(page.locator(".aurora")).toHaveCount(0);
  await expect(
    page.getByLabel("Reported value", { exact: true }),
  ).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openMenu(page);
  await expect(
    page.getByRole("button", { name: "Reduced motion on", exact: true }),
  ).toBeDisabled();
  expect(
    await page
      .locator(".aurora-wordmark")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
});
