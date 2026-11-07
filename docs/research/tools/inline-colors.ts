import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  DARK_TOKENS,
  EXACT,
  KEEP,
  LIGHT_CSS,
  LIGHT_SELECTOR,
  NEAR,
  ROOT,
  SITE,
  TEXT_TOKENS,
  candidateTokens,
  fetchText,
  isBlackOrWhite,
  nearestToken,
  parseColour,
  readTokens,
  type Rgba,
} from "./colours.ts";

type Category =
  "style" | "stylesheet" | "class" | "svg" | "fallback" | "dynamic";

type Found = {
  literal: string;
  category: Category;
  files: Set<string>;
  count: number;
  contexts: string[];
  textOnly: boolean;
};

type Entry = {
  light: string;
  token: string;
  distance: number;
  match: "exact" | "near" | "review";
  literal: string;
};

const INLINE_COLORS_FILE = path.join(ROOT, "src/theme/inline-colors.ts");
const INLINE_COLORS_BLOCK =
  /export const INLINE_COLORS: ReadonlyMap<string, string> = new Map\(\[[\s\S]*?\]\);/;
const COLOUR = /#[0-9a-fA-F]{3,8}\b|rgba?\([^()]*\)|oklch\([^()]*\)/g;
const SVG_ATTRIBUTE =
  /(fill|stroke|stopColor|floodColor|lightingColor)\s*:\s*`$/;
const CLASS_TOKEN = /[\w:/.-]*\[[^\s`"]*$/;
const TEXT_PROPERTY = /(?:^|[{,;\s])(color|text)\s*:\s*`?$/;
const VAR_FALLBACK = /var\(--[\w-]+,\s*$/;

/**
 * Chunks that draw card art: the card faces that the site renders when it has no card image.
 * A colour found only in these chunks stays as it is.
 */
const KEPT_CHUNKS = /^CardImage-/;

/**
 * Downloads the GameView chunk and the chunks it imports. The GameView chunk comes first.
 */
async function downloadBundles(outDir: string): Promise<Map<string, string>> {
  const home = await fetchText(`${SITE}/`);
  const mainName = required(home.match(/src="\/assets\/(main-[\w-]+\.js)"/));
  const main = await fetchText(`${SITE}/assets/${mainName}`);
  const gameName = required(main.match(/(GameView-[\w-]+\.js)/));
  const game = await fetchText(`${SITE}/assets/${gameName}`);
  const imports = [...game.matchAll(/from"\.\/([\w.-]+\.js)"/g)]
    .map((match) => required(match))
    .filter((name) => name !== mainName);
  const names = [...new Set(imports)].sort();

  const bundles = new Map([[gameName, game]]);
  for (const name of names) {
    bundles.set(name, await fetchText(`${SITE}/assets/${name}`));
  }

  const bundleDir = path.join(outDir, "bundles");
  await mkdir(bundleDir, { recursive: true });
  for (const [name, source] of bundles) {
    await writeFile(path.join(bundleDir, name), source);
  }
  return bundles;
}

function required(match: RegExpMatchArray | null): string {
  const group = match?.[1];
  if (group === undefined) {
    throw new Error("The site changed: a chunk name is missing.");
  }
  return group;
}

/**
 * Decides where a colour literal ends, from the code around it.
 */
function categorise(source: string, start: number, literal: string): Category {
  const before = source.slice(Math.max(0, start - 200), start);
  const after = source.slice(
    start + literal.length,
    start + literal.length + 1,
  );
  if (literal.includes("${")) {
    return "dynamic";
  }
  const template = source.slice(
    source.lastIndexOf("`", start - 1),
    source.indexOf("`", start),
  );
  if (
    template.includes("{") &&
    template.includes("}") &&
    !template.includes("${")
  ) {
    return "stylesheet";
  }
  if (VAR_FALLBACK.test(before)) {
    return "fallback";
  }
  if (SVG_ATTRIBUTE.test(before)) {
    return "svg";
  }
  const insideBrackets = before.slice(before.lastIndexOf("["));
  if (
    CLASS_TOKEN.test(before) &&
    ["]", "_", ")", ","].includes(after) &&
    !insideBrackets.includes(" ")
  ) {
    return "class";
  }
  return "style";
}

function collect(bundles: Map<string, string>): Found[] {
  const found = new Map<string, Found>();
  for (const [name, source] of bundles) {
    for (const match of source.matchAll(COLOUR)) {
      const literal = match[0];
      const start = match.index;
      const category = categorise(source, start, literal);
      const key = `${literal}\u0000${category}`;
      const entry = found.get(key) ?? {
        literal,
        category,
        files: new Set<string>(),
        count: 0,
        contexts: [],
        textOnly: true,
      };
      found.set(key, entry);
      entry.files.add(name);
      entry.count += 1;
      if (entry.contexts.length < 2) {
        entry.contexts.push(
          source.slice(Math.max(0, start - 60), start + literal.length + 30),
        );
      }
      if (!TEXT_PROPERTY.test(source.slice(Math.max(0, start - 20), start))) {
        entry.textOnly = false;
      }
    }
  }
  return [...found.values()];
}

function formatAlpha(alpha: number): string {
  if (alpha === 0 || alpha === 1) {
    return String(alpha);
  }
  return alpha.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

/**
 * Writes a colour the way Chrome writes it in a style attribute.
 */
function serialise([r, g, b]: Rgba, alpha: number): string {
  if (alpha >= 1) {
    return `rgb(${r}, ${g}, ${b})`;
  }
  return `rgba(${r}, ${g}, ${b}, ${formatAlpha(alpha)})`;
}

function buildMap(
  found: Found[],
  dark: Map<string, Rgba>,
  light: Map<string, Rgba>,
): Map<string, Entry> {
  const kept = new Set(Object.values(KEEP).flat());
  const candidates = candidateTokens(dark, light);
  const textCandidates = candidates.filter((name) => TEXT_TOKENS.test(name));
  const mapping = new Map<string, Entry>();

  for (const entry of found) {
    const colour = parseColour(entry.literal);
    if (
      entry.category !== "style" ||
      !colour ||
      kept.has(entry.literal) ||
      isBlackOrWhite(colour) ||
      [...entry.files].every((file) => KEPT_CHUNKS.test(file))
    ) {
      continue;
    }
    const { token, distance } = nearestToken(
      colour,
      entry.textOnly ? textCandidates : candidates,
      dark,
    );
    const lightColour = light.get(token);
    if (!lightColour) {
      continue;
    }
    mapping.set(serialise(colour, colour[3]), {
      light: serialise(lightColour, colour[3]),
      token,
      distance: Math.round(distance * 1000) / 1000,
      match: distance < EXACT ? "exact" : distance < NEAR ? "near" : "review",
      literal: entry.literal,
    });
  }

  return new Map(
    [...mapping].sort(
      ([firstKey, first], [secondKey, second]) =>
        compare(first.match, second.match) || compare(firstKey, secondKey),
    ),
  );
}

function compare(first: string, second: string): number {
  return first < second ? -1 : first > second ? 1 : 0;
}

function renderMap(mapping: Map<string, Entry>): string {
  const lines = [...mapping].map(
    ([key, entry]) => `  ["${key}", "${entry.light}"],`,
  );
  return [
    "export const INLINE_COLORS: ReadonlyMap<string, string> = new Map([",
    ...lines,
    "]);",
  ].join("\n");
}

/**
 * Collects the colours that the endstep.cc game view writes in inline styles, and maps them to the light theme.
 *
 * Usage: `node docs/research/tools/inline-colors.ts OUT_DIR [--write]`
 *
 * It downloads the GameView chunk and the chunks it imports into OUT_DIR/bundles,
 * and writes the full report to OUT_DIR/inline-colors.json.
 * With --write, it replaces INLINE_COLORS in src/theme/inline-colors.ts. Without it, it prints the map.
 *
 * Every colour literal gets one category, from the code around it:
 * - style: a value that ends in a `style` attribute (React style object or cssText). The inline fixer handles these.
 * - stylesheet: CSS text that the site puts in a style element. site-colors.ts does not see it either; check it by hand.
 * - class: a Tailwind arbitrary class such as `text-[#a08658]`. site-colors.ts handles it.
 * - svg: an SVG presentation attribute (fill, stroke, stopColor). light.css can override it.
 * - fallback: the fallback of var(--token, colour). The token already switches.
 * - dynamic: a colour built at runtime. It cannot be mapped statically.
 *
 * A `style` colour maps to the opaque dark token that is nearest in OKLab, never a mana or chart series token.
 * If the colour is only used as a text colour, only text tokens are candidates.
 * The replacement is the light value of that token, with the alpha of the original colour.
 * The colours in KEEP, black and white, and the colours found only in KEPT_CHUNKS stay as they are.
 */
async function main(): Promise<void> {
  const [outDir, flag] = process.argv.slice(2);
  if (!outDir) {
    throw new Error(
      "Usage: node docs/research/tools/inline-colors.ts OUT_DIR [--write]",
    );
  }
  await mkdir(outDir, { recursive: true });
  const bundles = await downloadBundles(outDir);
  const dark = readTokens(await readFile(DARK_TOKENS, "utf8"), ":root");
  const light = readTokens(await readFile(LIGHT_CSS, "utf8"), LIGHT_SELECTOR);
  const found = collect(bundles);
  const mapping = buildMap(found, dark, light);

  const report = {
    bundles: [...bundles.keys()].sort(),
    map: Object.fromEntries(mapping),
    kept: KEEP,
    literals: found
      .map((entry) => ({
        literal: entry.literal,
        category: entry.category,
        count: entry.count,
        files: [...entry.files].sort(),
        contexts: entry.contexts,
      }))
      .sort(
        (first, second) =>
          compare(first.category, second.category) ||
          compare(first.literal, second.literal),
      ),
  };
  await writeFile(
    path.join(outDir, "inline-colors.json"),
    JSON.stringify(report, null, 1),
  );

  const counts: Record<string, number> = {};
  for (const entry of found) {
    counts[entry.category] = (counts[entry.category] ?? 0) + 1;
  }
  console.error(
    `bundles: ${bundles.size} | unique literals per category: ${JSON.stringify(counts)}`,
  );
  console.error(`map entries: ${mapping.size}`);

  const block = renderMap(mapping);
  if (flag === "--write") {
    const file = await readFile(INLINE_COLORS_FILE, "utf8");
    if (!INLINE_COLORS_BLOCK.test(file)) {
      throw new Error(`INLINE_COLORS not found in ${INLINE_COLORS_FILE}`);
    }
    await writeFile(
      INLINE_COLORS_FILE,
      file.replace(INLINE_COLORS_BLOCK, () => block),
    );
  } else {
    console.log(block);
  }
}

await main();
