import { expect, test } from "./fixtures";
import { AxeBuilder } from "@axe-core/playwright";
import { Endstep, type Guest } from "./pages/endstep";

test.describe("Extension", () => {
  test("the popup switches endstep.cc to the dark theme without a reload", async ({
    context,
    extensionId,
  }) => {
    const endstep = await context.newPage();
    await endstep.goto("https://endstep.cc/");

    await expect(endstep.locator("html")).toHaveAttribute(
      "data-elt-theme",
      "light",
    );

    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await endstep.bringToFront();
    await popup.reload();

    const dark = popup.getByRole("radio", { name: "Dark" });
    await expect(dark).toBeEnabled();

    await popup.locator('label[for="dark"]').click();
    await expect(dark).toBeChecked();

    await expect(endstep.locator("html")).not.toHaveAttribute("data-elt-theme");

    await endstep.close();
    await popup.close();
  });
});

test.describe("Light theme", () => {
  test("it adds the light theme to endstep", async ({
    page,
    guest: _guest,
  }) => {
    await page.goto("https://endstep.cc/");

    await expect(page.locator("style#elt-theme")).toBeAttached();
    await expect(page.locator("html")).toHaveAttribute(
      "data-elt-theme",
      "light",
    );

    const voidColor = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--color-void")
        .trim(),
    );
    expect(voidColor).toBe("#f6f3ec");
  });
});

test.describe("Contrast", () => {
  const PAGES = [
    {
      name: "home",
      url: () => new URL(Endstep.URL),
    },
    {
      name: "decks",
      url: () => new URL(`${Endstep.URL}/decks`),
    },
    {
      name: "tournaments",
      url: () => new URL(`${Endstep.URL}/tournaments`),
    },
    {
      name: "metagame",
      url: () => new URL(`${Endstep.URL}/metagame`),
    },
    {
      name: "profile",
      url: (guest: Guest) => new URL(`${Endstep.URL}/u/${guest.username}`),
    },
  ];

  for (const target of PAGES) {
    test(`it passes the color-contrast accessibility check on the ${target.name} page`, async ({
      page,
      guest,
    }) => {
      const url = target.url(guest);

      await page.goto(url.toString());

      await expect(page.locator("style#elt-theme")).toBeAttached();
      await expect(page.locator("html")).toHaveAttribute(
        "data-elt-theme",
        "light",
      );

      const results = await new AxeBuilder({ page })
        .withRules(["color-contrast"])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }

  test(`it passes the color-contrast accessibility check on the game page`, async ({
    page,
    game,
  }) => {
    await page.goto(game.toString());

    await page.getByTestId("game-root").waitFor();
    await page.getByTestId("me-life").waitFor();

    await expect(page.locator("style#elt-theme")).toBeAttached();
    await expect(page.locator("html")).toHaveAttribute(
      "data-elt-theme",
      "light",
    );

    const results = await new AxeBuilder({ page })
      .withRules(["color-contrast"])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
