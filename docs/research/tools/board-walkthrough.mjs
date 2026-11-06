import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("@playwright/test");
const { AxeBuilder } = require("@axe-core/playwright");

const [extensionPath, outDir, firstArg = "play", stepsArg = "80"] =
  process.argv.slice(2);
const maxSteps = Number(stepsArg);

const DECK = [
  "22 Mountain",
  "4 Goblin Guide",
  "4 Monastery Swiftspear",
  "4 Lightning Bolt",
  "4 Shock",
  "4 Lava Spike",
  "4 Rift Bolt",
  "4 Chain Lightning",
  "4 Searing Spear",
  "4 Skewer the Critics",
  "2 Fireblast",
].join("\n");

const ONE_DROP_CREATURES = ["Goblin Guide", "Monastery Swiftspear"];
const ONE_DROP_BURN = [
  "Lightning Bolt",
  "Shock",
  "Lava Spike",
  "Chain Lightning",
  "Rift Bolt",
];
const TWO_DROP_BURN = ["Searing Spear"];

/**
 * Drives one guest game against the bot with the extension loaded, and
 * stores a screenshot of every state it reaches, plus a log and axe results.
 */
async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const log = [];
  const note = (...parts) => {
    const line = parts.join(" ");
    log.push(line);
    console.log(line);
  };

  const context = await chromium.launchPersistentContext("", {
    channel: "chromium",
    viewport: { width: 1440, height: 900 },
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  const root = () => page.getByTestId("game-root");

  let shot = 0;
  const shoot = async (name) => {
    shot += 1;
    const base = `${String(shot).padStart(2, "0")}-${name}`;
    await page.screenshot({
      path: path.join(outDir, `${base}.jpg`),
      type: "jpeg",
      quality: 82,
    });
    note(`[shot] ${base}`);
    return base;
  };
  const shootRails = async (name) => {
    const left = page.locator(".wr-rail-left").first();
    if (await left.count())
      await left.screenshot({
        path: path.join(outDir, `${name}-rail-left.png`),
      });
    const right = page.getByRole("complementary", { name: /Phase tracker/ });
    if (await right.count())
      await right.screenshot({
        path: path.join(outDir, `${name}-rail-right.png`),
      });
  };
  const axe = async (label) => {
    const results = await new AxeBuilder({ page })
      .withRules(["color-contrast"])
      .analyze();
    const rows = results.violations.flatMap((v) =>
      v.nodes.map((n) => {
        const d = n.any[0]?.data ?? {};
        return {
          state: label,
          text: n.html.replace(/\s+/g, " ").slice(0, 140),
          target: n.target.join(" "),
          fg: d.fgColor,
          bg: d.bgColor,
          ratio: d.contrastRatio,
          expected: d.expectedContrastRatio,
        };
      }),
    );
    note(`[axe] ${label}: ${rows.length} contrast violation(s)`);
    return rows;
  };
  const visibleButtons = async () =>
    root()
      .getByRole("button")
      .evaluateAll((els) =>
        els
          .filter((e) => {
            const r = e.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && !e.disabled;
          })
          .map(
            (e) =>
              e.getAttribute("aria-label") ||
              e.textContent.replace(/\s+/g, " ").trim(),
          )
          .filter(Boolean),
      );
  const decisionText = async () => {
    const box = page.locator(".wr-ds-active").first();
    if (!(await box.count())) return "";
    return (await box.innerText()).replace(/\s+/g, " ").trim().slice(0, 200);
  };
  const clickButton = async (name, timeout = 2_000) => {
    try {
      await root().getByRole("button", { name }).first().click({ timeout });
      return true;
    } catch {
      return false;
    }
  };
  const exact = (card) =>
    new RegExp(`^${card.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
  const dismissToast = async () => {
    const title = page.getByText("Get notified", { exact: true });
    if (!(await title.count())) return;
    const enable = page.getByRole("button", { name: "Enable" });
    const box = await enable.boundingBox().catch(() => null);
    if (box) {
      await page.mouse.click(box.x + box.width + 34, box.y + box.height / 2);
      await page.waitForTimeout(500);
    }
    note(
      `[toast] "Get notified" ${(await title.count()) ? "still visible" : "dismissed"}`,
    );
  };
  const dialogsSeen = new Set();
  const settleDialogs = async () => {
    const dialogs = await page.getByRole("dialog").evaluateAll((els) =>
      els.map((e) => {
        const r = e.getBoundingClientRect();
        const buttons = [...e.querySelectorAll("button")].map(
          (b) =>
            b.getAttribute("aria-label") ||
            b.textContent.replace(/\s+/g, " ").trim(),
        );
        return {
          name:
            e.getAttribute("aria-label") ||
            e.querySelector("h1,h2,h3")?.textContent?.trim() ||
            "",
          cls: (e.className || "").toString().slice(0, 60),
          visible: r.width > 0 && r.height > 0,
          buttons,
        };
      }),
    );
    for (const d of dialogs) {
      const key = `${d.name}|${d.cls}`;
      if (!dialogsSeen.has(key)) {
        dialogsSeen.add(key);
        note(
          `[dialog seen] name="${d.name}" class="${d.cls}" visible=${d.visible} buttons=${JSON.stringify(d.buttons.slice(0, 6))}`,
        );
      }
    }
    const modal = dialogs.find(
      (d) =>
        d.visible &&
        d.buttons.some((b) => /^(confirm|cancel|ok)$/i.test(b)) &&
        !/concede|defeat|victory|board menu/i.test(d.name),
    );
    if (!modal) return false;
    note(`[dialog] "${modal.name}"`);
    await shoot(
      `dialog-${
        modal.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .slice(0, 30) || "unnamed"
      }`,
    );
    const dialog = page.getByRole("dialog", { name: modal.name }).last();
    const myTurn = /your turn/i.test(
      await root()
        .locator(".wr-turn-chip, [class*='turn-chip']")
        .first()
        .innerText()
        .catch(() => ""),
    );
    const choice =
      /pass priority until/i.test(modal.name) && myTurn
        ? /^cancel$/i
        : /^(confirm|ok)$/i;
    const btn = dialog.getByRole("button", { name: choice });
    if (await btn.count())
      await btn
        .first()
        .click()
        .catch(() => {});
    else
      await dialog
        .getByRole("button", { name: /^cancel$/i })
        .first()
        .click()
        .catch(() => {});
    await page.waitForTimeout(800);
    return true;
  };
  const myBattlefield = () =>
    root()
      .locator(".zone-battlefield")
      .filter({ has: page.getByRole("button", { name: "Board menu" }) });
  const landsOnBattlefield = async () =>
    myBattlefield()
      .getByRole("button", { name: /^Mountain/ })
      .count();

  const violations = [];
  let gameUrl = "";
  try {
    await page.goto("https://endstep.cc/");
    await page.getByRole("button", { name: "Play as a guest" }).click();
    await page.getByRole("button", { name: /^Your account: guest_/ }).waitFor();
    await page.getByRole("button", { name: /^Play vs bot/ }).click();
    await page.waitForURL(/\/lobby\//);
    await page
      .getByRole("button", { name: "Choose your deck" })
      .first()
      .click();
    await page.getByRole("button", { name: "Build a new deck" }).click();
    await page.waitForURL(/\/decks\//);
    await page.getByRole("button", { name: "Paste a list" }).click();
    const dialog = page.getByRole("dialog", { name: "Paste a list" });
    await dialog.getByRole("textbox", { name: "The list" }).fill(DECK);
    await dialog.getByRole("button", { name: "Apply" }).click();
    await page.waitForTimeout(1500);
    await shoot("deck-builder");
    await page.getByRole("link", { name: "Back to the table" }).click();
    await page.waitForURL(/\/lobby\//);
    await shoot("lobby");
    await page
      .getByRole("button", { name: "Choose your deck" })
      .first()
      .click();
    await page.getByRole("button", { name: /^Untitled/ }).click();
    await page.getByRole("button", { name: /^Begin with / }).click();
    await page.waitForURL(/\/game\//);
    await root().waitFor();
    await page.getByTestId("me-life").waitFor();
    await page.waitForTimeout(2500);
    gameUrl = page.url();
    note(
      "[game]",
      gameUrl,
      "theme:",
      await page.locator("html").getAttribute("data-elt-theme"),
    );
    await dismissToast();

    await shoot("start-dialog");
    const offered = await visibleButtons();
    note(
      "[start buttons]",
      JSON.stringify(
        offered.filter(
          (b) => /first|second|play|draw/i.test(b) && !/Pass/.test(b),
        ),
      ),
    );
    if (firstArg === "play")
      (await clickButton(/^Play first/, 3_000)) ||
        (await clickButton(/^Draw first/, 3_000));
    else
      (await clickButton(/^Draw first/, 3_000)) ||
        (await clickButton(/^Play first/, 3_000));
    await page.waitForTimeout(1500);
    await dismissToast();
    await shoot("opening-hand");
    await shootRails("opening-hand");
    violations.push(...(await axe("opening hand")));
    await clickButton(/^Keep 7/, 5_000);
    await page.waitForTimeout(2500);
    await dismissToast();

    let landThisTurn = false;
    let lastDecision = "";
    let sameDecisionCount = 0;
    let passes = 0;
    let turnMarker = "";
    const tried = new Set();
    let manaUsed = 0;
    for (let step = 0; step < maxSteps; step += 1) {
      const ended = page.getByRole("dialog", { name: /Victory|Defeat|Draw/ });
      if (await ended.count()) {
        await shoot("game-over");
        violations.push(...(await axe("game over")));
        note(
          "[end]",
          (await ended.innerText().catch(() => ""))
            .replace(/\s+/g, " ")
            .slice(0, 120),
        );
        break;
      }
      if (await settleDialogs()) continue;
      await dismissToast();
      const decision = await decisionText();
      const buttons = await visibleButtons();
      if (step < 2) {
        const cards = buttons.filter((b) =>
          /Mountain|Guide|Swiftspear|Bolt|Spike|Shock|Lightning|Spear|Skewer|Fireblast/.test(
            b,
          ),
        );
        note(
          `[step ${step}] card buttons: ${JSON.stringify(cards.slice(0, 16))}`,
        );
      }
      const turnRaw = await root()
        .locator(".wr-turn-chip, [class*='turn-chip']")
        .first()
        .innerText()
        .catch(() => "");
      const turn = (turnRaw
        .replace(/\s+/g, " ")
        .match(/(YOUR|OPP) TURN T\d+/i) || [""])[0];
      if (turn && turn !== turnMarker) {
        turnMarker = turn;
        landThisTurn = false;
        manaUsed = 0;
        tried.clear();
        note(`[turn] ${turn.replace(/\s+/g, " ")}`);
      }
      if (decision !== lastDecision) {
        note(`[step ${step}] decision: "${decision}"`);
        note(
          `[step ${step}] buttons: ${JSON.stringify(buttons.filter((b) => !/^Stop |^Preview /.test(b)).slice(0, 20))}`,
        );
        lastDecision = decision;
        sameDecisionCount = 0;
        if (/attack|block|target|choose|order|trigger|pay/i.test(decision)) {
          await shoot(
            `decision-${decision
              .replace(/^DECISION\s*/i, "")
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .slice(0, 36)}`,
          );
          violations.push(...(await axe(`decision: ${decision.slice(0, 50)}`)));
        }
      } else {
        sameDecisionCount += 1;
      }

      if (/auto pay/i.test(decision)) {
        const control = page.getByRole("button", { name: /^Auto pay/i });
        if (
          (await control.count()) &&
          (await control
            .first()
            .isEnabled()
            .catch(() => false))
        ) {
          await control
            .first()
            .click({ timeout: 2_000 })
            .catch(() => {});
          manaUsed += 1;
          note(`[step ${step}] auto pay (mana used this turn: ${manaUsed})`);
          await page.waitForTimeout(1500);
          await shoot("after-auto-pay");
        } else {
          const cancel = page.getByRole("button", {
            name: /^(Cancel mana payment|Don't Pay|Cancel)/,
          });
          if (await cancel.count())
            await cancel
              .first()
              .click({ timeout: 2_000 })
              .catch(() => {});
          else await page.keyboard.press("Escape");
          note(
            `[step ${step}] cannot pay, cancelled (${await cancel.count()} cancel control(s))`,
          );
          await page.waitForTimeout(800);
          if (sameDecisionCount >= 4) {
            await shoot("stuck-payment");
            note(
              `[step ${step}] payment prompt will not close, buttons: ${JSON.stringify(buttons.slice(0, 12))}`,
            );
            sameDecisionCount = 0;
          }
        }
        continue;
      }
      if (/target/i.test(decision)) {
        const opp = page.getByTestId("opp-life");
        const avatar = root()
          .getByRole("button", { name: /Forge AI/ })
          .first();
        const target = (await opp.count())
          ? opp.first()
          : (await avatar.count())
            ? avatar
            : null;
        if (target) {
          await target
            .click({ timeout: 2_000 })
            .catch((e) =>
              note(
                `[step ${step}] target click failed: ${e.message.split("\n")[0]}`,
              ),
            );
          note(`[step ${step}] targeted the opponent`);
          await page.waitForTimeout(1200);
          await shoot("after-target");
          const confirm = (await visibleButtons()).find((b) =>
            /^(confirm|done|cast)/i.test(b),
          );
          if (confirm)
            await clickButton(new RegExp(`^${confirm.slice(0, 8)}`, "i"));
          continue;
        }
      }
      if (
        /click your creatures to attack/i.test(decision) ||
        buttons.some((b) => /^Alpha strike/i.test(b))
      ) {
        await clickButton(/^Alpha strike/i);
        await page.waitForTimeout(700);
        note(`[step ${step}] alpha strike`);
        await page.waitForTimeout(600);
        await shoot("attackers-selected");
        if (await clickButton(/^Done selecting attackers/i))
          note(`[step ${step}] done selecting attackers`);
        await page.waitForTimeout(1500);
        await shoot("after-attack");
        await shootRails("after-attack");
        continue;
      }
      const blockConfirm = buttons.find((b) =>
        /^(Done selecting blockers|No blocks|Done blocking)/i.test(b),
      );
      if (blockConfirm || /click your creatures to block/i.test(decision)) {
        await shoot("blockers-prompt");
        await clickButton(
          /^(Done selecting blockers|No blocks|Done blocking)/i,
        );
        note(`[step ${step}] blockers: "${blockConfirm}"`);
        await page.waitForTimeout(1200);
        await shoot("after-blocks");
        continue;
      }
      const doneBtn = buttons.find((b) => /^(Done selecting|Confirm)/i.test(b));
      if (doneBtn && sameDecisionCount >= 1) {
        if (/discard|choose/i.test(decision)) {
          const card = await (async () => {
            const m = root().getByRole("button", {
              name: /^(Mountain|Chain Lightning|Lightning Bolt|Shock|Lava Spike|Rift Bolt|Searing Spear|Skewer the Critics|Fireblast)$/,
            });
            const n = await m.count();
            for (let i = n - 1; i >= 0; i -= 1) {
              const box = await m
                .nth(i)
                .boundingBox()
                .catch(() => null);
              if (box && box.y > 600) return m.nth(i);
            }
            return null;
          })();
          if (card) await card.click({ timeout: 1_500 }).catch(() => {});
          await page.waitForTimeout(500);
        }
        await clickButton(new RegExp(`^${doneBtn.slice(0, 10)}`, "i"));
        note(`[step ${step}] clicked "${doneBtn}"`);
        await page.waitForTimeout(1000);
        continue;
      }
      if (sameDecisionCount >= 3) {
        await clickButton(/^Pass priority/i, 1_500);
        sameDecisionCount = 0;
        await page.waitForTimeout(900);
        continue;
      }

      const handCard = async (card) => {
        const matches = root().getByRole("button", { name: exact(card) });
        const n = await matches.count();
        let best = null;
        let bestY = -1;
        for (let i = 0; i < n; i += 1) {
          const box = await matches
            .nth(i)
            .boundingBox()
            .catch(() => null);
          if (box && box.y > bestY) {
            bestY = box.y;
            best = matches.nth(i);
          }
        }
        return bestY > 600 ? best : null;
      };
      const myMain = /your (first|second) main phase/i.test(decision);

      if (myMain && !landThisTurn && !tried.has("Mountain")) {
        const land = await handCard("Mountain");
        if (land) {
          const before = await landsOnBattlefield();
          await land
            .click({ timeout: 2_000 })
            .catch((e) =>
              note(
                `[step ${step}] land click failed: ${e.message.split("\n")[0]}`,
              ),
            );
          await page.waitForTimeout(1500);
          const after = await landsOnBattlefield();
          landThisTurn = after > before;
          note(`[step ${step}] land click: lands ${before} -> ${after}`);
          if (!landThisTurn) tried.add("Mountain");
          await shoot("after-land");
          continue;
        }
      }
      if (myMain) {
        const lands = (await landsOnBattlefield()) - manaUsed;
        const castable = [
          ...(lands >= 1 ? [...ONE_DROP_CREATURES, ...ONE_DROP_BURN] : []),
          ...(lands >= 2 ? TWO_DROP_BURN : []),
        ].filter((c) => !tried.has(c));
        let cast = false;
        for (const card of castable) {
          const el = await handCard(card);
          if (!el) continue;
          tried.add(card);
          await el.click({ timeout: 2_000 }).catch(() => {});
          note(`[step ${step}] cast ${card} (lands: ${lands})`);
          await page.waitForTimeout(1500);
          await shoot(`cast-${card.toLowerCase().replace(/\s+/g, "-")}`);
          cast = true;
          break;
        }
        if (cast) continue;
      }
      if (await clickButton(/^Pass priority/i, 1_500)) {
        passes += 1;
        if (passes % 5 === 0) {
          await shoot(`after-${passes}-passes`);
          await shootRails(`after-${passes}-passes`);
          violations.push(...(await axe(`after ${passes} passes`)));
        }
        await page.waitForTimeout(900);
        continue;
      }
      note(`[step ${step}] nothing to do, waiting`);
      await page.waitForTimeout(2500);
    }

    await settleDialogs();
    await page
      .getByRole("button", { name: /^Cancel mana payment/ })
      .first()
      .click({ timeout: 1_000 })
      .catch(() => {});
    await page
      .getByRole("button", { name: "Open game log" })
      .click()
      .catch(() => {});
    await page.waitForTimeout(1200);
    await shoot("game-log");
    violations.push(...(await axe("game log")));
    const logPanel = page.getByRole("dialog", { name: "Game Log" });
    if (await logPanel.count()) {
      const closeBtn = logPanel.getByRole("button", {
        name: /close|dismiss|hide/i,
      });
      if (await closeBtn.count())
        await closeBtn
          .first()
          .click({ timeout: 2_000 })
          .catch(() => {});
      else {
        const box = await logPanel.boundingBox().catch(() => null);
        if (box) await page.mouse.click(box.x + box.width - 22, box.y + 20);
      }
      await page.waitForTimeout(500);
      note(`[log panel] ${(await logPanel.count()) ? "still open" : "closed"}`);
    }
    const bf = myBattlefield()
      .getByRole("button", {
        name: /^(Goblin Guide|Monastery Swiftspear|Mountain)/,
      })
      .first();
    if (await bf.count()) {
      await bf.hover().catch(() => {});
      await page.waitForTimeout(800);
      await shoot("hover-battlefield-card");
    }
    await settleDialogs();
    if (
      await page.getByRole("dialog", { name: /Victory|Defeat|Draw/ }).count()
    ) {
      note("[done] the game is over, nothing to concede");
      return;
    }
    await page
      .getByRole("button", { name: "Board menu" })
      .click({ force: true });
    await page.waitForTimeout(800);
    await shoot("board-menu");
    violations.push(...(await axe("board menu")));
    await page
      .getByRole("dialog", { name: "Board menu" })
      .getByRole("button", { name: "Concede" })
      .click();
    await page.waitForTimeout(600);
    await shoot("concede-dialog");
    await page
      .getByRole("dialog", { name: "Concede?" })
      .getByRole("button", { name: "Concede" })
      .click();
    await page.getByRole("dialog", { name: "Defeat" }).waitFor();
    await page.waitForTimeout(800);
    await shoot("defeat");
    violations.push(...(await axe("defeat dialog")));
    note("[done] conceded");
  } catch (error) {
    note("[error]", error.message.split("\n")[0]);
    await shoot("error").catch(() => {});
    try {
      await settleDialogs();
      await page
        .getByRole("button", { name: /^(Cancel mana payment|Don't Pay)/ })
        .first()
        .click({ timeout: 1_000 })
        .catch(() => {});
      await page
        .getByRole("button", { name: "Board menu" })
        .click({ timeout: 5_000, force: true });
      await page
        .getByRole("dialog", { name: "Board menu" })
        .getByRole("button", { name: "Concede" })
        .click();
      await page
        .getByRole("dialog", { name: "Concede?" })
        .getByRole("button", { name: "Concede" })
        .click();
      note("[cleanup] conceded after error");
    } catch (e) {
      note("[cleanup] concede failed:", e.message.split("\n")[0]);
    }
  } finally {
    fs.writeFileSync(path.join(outDir, "log.txt"), log.join("\n") + "\n");
    fs.writeFileSync(
      path.join(outDir, "axe.json"),
      JSON.stringify(violations, null, 1),
    );
    await context.close();
  }
}

main();
