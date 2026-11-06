import { test as base, chromium, type BrowserContext } from "@playwright/test";
import path from "node:path";
import { Endstep, type Guest } from "./pages/endstep";

type TestFixtures = {
  extensionId: string;
};

type WorkerFixtures = {
  extensionContext: BrowserContext;
  guest: Guest;
  game: URL;
};

const extensionPath = path.resolve(
  process.env.WXT_ENDSTEP_LIGHT_THEME_OUT_DIR ?? ".output",
  "chrome-mv3",
);

export const test = base.extend<TestFixtures, WorkerFixtures>({
  extensionContext: [
    async ({}, use) => {
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
    { scope: "worker" },
  ],
  context: async ({ extensionContext }, use) => {
    await use(extensionContext);
  },
  extensionId: async ({ extensionContext }, use) => {
    const page = await extensionContext.newPage();

    await page.goto("chrome://extensions");
    const id = await page.locator("extensions-item").first().getAttribute("id");
    await page.close();

    await use(id!);
  },
  guest: [
    async ({ extensionContext }, use) => {
      const page = await extensionContext.newPage();
      const endstep = new Endstep(page);

      const guest = await endstep.signInAsGuest();
      await page.close();

      await use(guest);
    },
    { scope: "worker" },
  ],
  game: [
    async ({ guest: _guest, extensionContext }, use) => {
      const page = await extensionContext.newPage();
      const endstep = new Endstep(page);

      const gameUrl = await endstep.playBotGame("60 Mountain");
      await page.close();

      await use(gameUrl);

      const cleanup = await extensionContext.newPage();
      await new Endstep(cleanup).concede(gameUrl).finally(async () => {
        await cleanup.close();
      });
    },
    { scope: "worker" },
  ],
});

export const expect = test.expect;
