import { expect, test } from "./fixtures";
import { AxeBuilder } from "@axe-core/playwright";
import { Endstep, type Guest } from "./pages/endstep";

test.describe("Extension", () => {
  test("the popup counter increases on click", async ({
    page,
    extensionId,
  }) => {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    const button = page.getByRole("button");
    await expect(button).toHaveText("count is 0");

    await button.click();
    await expect(button).toHaveText("count is 1");
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
  test.describe.configure({ retries: 0 });

  const PAGES = [
    {
      name: "home",
      url: () => new URL(Endstep.URL),
    },
    {
      name: "decks",
      url: () => new URL(`${Endstep.URL}`),
    },
    {
      name: "tournaments",
      path: () => "/tournaments",
      url: () => new URL(`${Endstep.URL}`),
    },
    { name: "metagame", url: () => new URL(`${Endstep.URL}/metagame`) },
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
