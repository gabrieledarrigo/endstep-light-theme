import { expect, test } from "./fixtures";

test("the extension is loaded", async ({ extensionId }) => {
  expect(extensionId).toMatch(/^[a-p]{32}$/);
});

test("the popup counter increases on click", async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/popup.html`);

  const button = page.getByRole("button");
  await expect(button).toHaveText("count is 0");

  await button.click();
  await expect(button).toHaveText("count is 1");
});
