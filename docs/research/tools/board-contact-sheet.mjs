import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("@playwright/test");

const [outDir, ...gameDirs] = process.argv.slice(2);
const THUMB_WIDTH = 720;
const KEEP_FULL = process.env.KEEP_FULL !== "0";

/**
 * Picks the screenshots worth keeping from one game: every distinct state,
 * without the repeated payment and error frames.
 */
function keepers(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".jpg"))
    .filter((f) => !/error|after-auto-pay/.test(f))
    .sort((a, b) => Number(a.split("-")[0]) - Number(b.split("-")[0]));
}

/**
 * Turns a screenshot file name into a short caption for a human reader.
 */
function caption(file) {
  return file
    .replace(/^\d+-/, "")
    .replace(/\.jpg$/, "")
    .replace(/^decision-/, "decision: ")
    .replace(/-/g, " ")
    .replace(/\s+(a|esc|space|ctrl|z)\b/gi, "")
    .trim();
}

/**
 * Groups the axe contrast violations of one game by the element they hit.
 */
function axeSummary(dir) {
  const file = path.join(dir, "axe.json");
  if (!fs.existsSync(file)) return [];
  const rows = JSON.parse(fs.readFileSync(file, "utf8"));
  const groups = new Map();
  for (const r of rows) {
    const key = `${r.target}|${r.fg}|${r.bg}`;
    const g = groups.get(key) ?? {
      target: r.target,
      fg: r.fg,
      bg: r.bg,
      ratio: r.ratio,
      text: r.text,
      states: new Set(),
    };
    g.states.add(r.state.replace(/^decision: DECISION\s*/, "").slice(0, 40));
    groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => b.states.size - a.states.size);
}

async function main() {
  fs.mkdirSync(path.join(outDir, "thumbs"), { recursive: true });
  const browser = await chromium.launch({ channel: "chromium" });
  const page = await browser.newPage({
    viewport: { width: THUMB_WIDTH, height: 450 },
    deviceScaleFactor: 1,
  });
  const games = [];
  for (const dir of gameDirs) {
    const name = path.basename(dir);
    const full = path.join(outDir, name);
    fs.mkdirSync(full, { recursive: true });
    const shots = [];
    const seen = new Set();
    for (const file of keepers(dir)) {
      const unique = !seen.has(caption(file));
      seen.add(caption(file));
      if (unique && KEEP_FULL)
        fs.copyFileSync(path.join(dir, file), path.join(full, file));
      const thumb = `${name}-${file}`;
      const data = fs.readFileSync(path.join(dir, file)).toString("base64");
      await page.setContent(
        `<img src="data:image/jpeg;base64,${data}" style="display:block;width:${THUMB_WIDTH}px">`,
      );
      await page.locator("img").evaluate((img) => img.decode());
      await page
        .locator("img")
        .screenshot({
          path: path.join(outDir, "thumbs", thumb),
          type: "jpeg",
          quality: 72,
        });
      shots.push({
        file,
        thumb,
        caption: caption(file),
        full: unique && KEEP_FULL,
      });
    }
    for (const png of fs.readdirSync(dir).filter((f) => f.endsWith(".png")))
      fs.copyFileSync(path.join(dir, png), path.join(full, png));
    const log = fs.existsSync(path.join(dir, "log.txt"))
      ? fs.readFileSync(path.join(dir, "log.txt"), "utf8")
      : "";
    const end = (log.match(/^\[end\] (.*)$/m) || [])[1] ?? "";
    games.push({
      name,
      shots,
      axe: axeSummary(dir),
      end,
      start: (log.match(/^\[start buttons\] (.*)$/m) || [])[1] ?? "",
    });
  }
  await browser.close();

  const esc = (s) =>
    String(s).replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
    );
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Board walkthrough</title>
<style>
  :root { color-scheme: light; }
  body { margin: 0; padding: 24px; font: 14px/1.5 system-ui, sans-serif; background: #f3f1ec; color: #1f1c17; }
  h1, h2, h3 { font-weight: 600; margin: 0 0 8px; }
  p { max-width: 70ch; margin: 0 0 12px; }
  section { margin-bottom: 48px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 14px; }
  figure { margin: 0; background: #fff; border: 1px solid #d9d3c6; border-radius: 8px; overflow: hidden; }
  figure img { display: block; width: 100%; height: auto; }
  figcaption { padding: 8px 10px; font-size: 13px; display: flex; gap: 8px; align-items: baseline; }
  figcaption .n { font-family: ui-monospace, monospace; font-size: 11px; color: #6b6457; }
  table { border-collapse: collapse; font-size: 13px; margin-top: 12px; }
  th, td { text-align: left; padding: 5px 10px; border-bottom: 1px solid #d9d3c6; vertical-align: top; }
  th { font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: #6b6457; font-weight: 500; }
  code { font-family: ui-monospace, monospace; font-size: 12px; }
  .sw { display: inline-block; width: 12px; height: 12px; border: 1px solid #0003; vertical-align: -1px; margin-right: 4px; }
</style></head><body>
<h1>Board walkthrough with the light theme</h1>
<p>Two guest games against the bot, captured with the extension loaded and the revised tokens plus the board rules applied. ${KEEP_FULL ? "Click a thumbnail for the full 1440 × 900 frame; repeated states keep only the thumbnail." : "This copy holds the thumbnails only; the full frames are on the design page."} The rails are also stored as PNG next to each game.</p>
${games
  .map(
    (g) => `<section id="${esc(g.name)}">
<h2>${esc(g.name)}</h2>
<p>${esc(g.end ? `Result: ${g.end.slice(0, 120)}` : "The game was conceded or stopped before the end.")}</p>
<div class="grid">
${g.shots.map((s) => `<figure><a href="${s.full ? `${esc(g.name)}/${esc(s.file)}` : `thumbs/${esc(s.thumb)}`}"><img loading="lazy" src="thumbs/${esc(s.thumb)}" alt="${esc(s.caption)}"></a><figcaption><span class="n">${esc(s.file.split("-")[0])}</span>${esc(s.caption)}</figcaption></figure>`).join("\n")}
</div>
<h3 style="margin-top:20px">Contrast violations found by axe during this game</h3>
<table><thead><tr><th>Element</th><th>Colours</th><th>Ratio</th><th>Seen in</th></tr></thead><tbody>
${g.axe.map((a) => `<tr><td><code>${esc(a.target)}</code><br><small>${esc(a.text.slice(0, 80))}</small></td><td><span class="sw" style="background:${esc(a.fg)}"></span>${esc(a.fg)} on <span class="sw" style="background:${esc(a.bg)}"></span>${esc(a.bg)}</td><td>${esc(a.ratio)}:1</td><td>${esc([...a.states].slice(0, 4).join("; "))}${a.states.size > 4 ? ` … (${a.states.size} states)` : ""}</td></tr>`).join("\n")}
</tbody></table>
</section>`,
  )
  .join("\n")}
</body></html>`;
  fs.writeFileSync(path.join(outDir, "index.html"), html);
  console.log(
    `contact sheet: ${path.join(outDir, "index.html")} (${games.map((g) => `${g.name}: ${g.shots.length} frames`).join(", ")})`,
  );
}

main();
