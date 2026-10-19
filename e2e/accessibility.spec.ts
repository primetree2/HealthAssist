import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
for (const colorScheme of ["light", "dark"] as const)
  test(`core screens have no automated WCAG A/AA violations (${colorScheme})`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await page.goto("/");
    for (const screen of [
      "welcome",
      "overview",
      "labs",
      "checkin",
      "sources",
    ]) {
      if (screen === "overview")
        await page
          .getByRole("button", { name: "Explore with fictional data" })
          .click();
      if (["labs", "checkin", "sources"].includes(screen)) {
        if (
          await page
            .getByRole("button", { name: "Open navigation" })
            .isVisible()
        )
          await page.getByRole("button", { name: "Open navigation" }).click();
        await page
          .getByRole("button", {
            name:
              screen === "labs"
                ? "Lab notebook"
                : screen === "checkin"
                  ? "Check-in"
                  : "Sources & safety",
            exact: true,
          })
          .first()
          .click();
      }
      const scan = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        scan.violations,
        JSON.stringify(
          scan.violations.map((v) => ({
            id: v.id,
            nodes: v.nodes.map((n) => n.target),
          })),
          null,
          2,
        ),
      ).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${screen} has horizontal overflow`,
      ).toBe(true);
    }
  });
