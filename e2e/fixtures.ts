import { test as base, chromium, type BrowserContext } from "@playwright/test";
import path from "node:path";

const extensionPath = path.resolve(
  process.env.WXT_ENDSTEP_LIGHT_THEME_OUT_DIR ?? ".output",
  "chrome-mv3",
);

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext("", {
      channel: "chromium",
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    const worker =
      context.serviceWorkers()[0] ??
      (await context.waitForEvent("serviceworker"));

    await use(worker.url().split("/")[2]!);
  },
});

export const expect = test.expect;
