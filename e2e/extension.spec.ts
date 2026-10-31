import { expect, test } from "./fixtures";

test("the extension is loaded", async ({ extensionId }) => {
  expect(extensionId).toMatch(/^[a-p]{32}$/);
});

test("it adds the light theme to endstep", async ({ page }) => {
  await page.goto("https://endstep.cc/");

  await expect(page.locator("style#elt-theme")).toBeAttached();
  await expect(page.locator("html")).toHaveAttribute("data-elt-theme", "light");

  const voidColor = await page.evaluate(() =>
    getComputedStyle(document.documentElement)
      .getPropertyValue("--color-void")
      .trim(),
  );
  expect(voidColor).toBe("#f6f3ec");
});

test("the popup counter increases on click", async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/popup.html`);

  const button = page.getByRole("button");
  await expect(button).toHaveText("count is 0");

  await button.click();
  await expect(button).toHaveText("count is 1");
});
