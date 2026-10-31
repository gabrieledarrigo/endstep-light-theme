import path from "node:path";
import { converter, parse } from "culori";
import postcss from "postcss";

/**
 * A colour as 8-bit red, green and blue channels, plus an alpha from 0 to 1.
 */
export type Rgba = readonly [number, number, number, number];

/**
 * The nearest token to a colour, and its distance in OKLab.
 */
export type Match = {
  token: string;
  distance: number;
};

export const SITE = "https://endstep.cc";
export const ROOT = path.resolve(import.meta.dirname, "../../..");
export const DARK_TOKENS = path.join(
  ROOT,
  "docs/research/original-palette.css",
);
export const LIGHT_CSS = path.join(ROOT, "src/theme/light.css");
export const LIGHT_SELECTOR = 'html[data-elt-theme="light"]';

/**
 * Below this OKLab distance, a colour is a copy of the token.
 */
export const EXACT = 0.01;

/**
 * From this OKLab distance up, a colour is not a variant of the token, so the scripts do not map it.
 */
export const NEAR = 0.05;

/**
 * Tokens that carry a meaning. A colour never maps to them.
 */
export const EXCLUDED_TOKENS = /^--color-(mana|series)-/;

/**
 * Tokens for text. A text colour maps only to them.
 */
export const TEXT_TOKENS =
  /^--(color-text-|es-(text|muted|display)$|log-text-)/;

/**
 * Colours that stay as they are, grouped by the reason.
 */
export const KEEP: Readonly<Record<string, readonly string[]>> = {
  "shadows and highlights": ["#000", "#fff", "#ffffff"],
  "mana symbols": [
    "#f5f0d8",
    "#2a6db0",
    "#39323d",
    "#b03a2e",
    "#2f7d43",
    "#b9b2a6",
  ],
  "player colours": [
    "#8a6f4a",
    "#4a6f8a",
    "#6f8a4a",
    "#8a4a5f",
    "#6a5a8a",
    "#4a8a7f",
  ],
  "damage, life and gain numbers": [
    "#c0553a",
    "#7a9b4e",
    "#2ea043",
    "rgba(192,85,58,0.45)",
    "rgba(122,155,78,0.45)",
    "rgba(46,160,67,0.45)",
  ],
  "turn jewels": [
    "rgba(255,245,210,.55)",
    "rgba(220,235,255,.55)",
    "#f3d99a",
    "#e6b35a",
    "#7a5520",
    "#f0c878",
    "#a8c6e8",
    "#7da3d1",
    "#5a7fb0",
    "#2c4566",
  ],
  "card backs in piles": [
    "#4a3a28",
    "#2e2418",
    "#1a1410",
    "#3a2e1e",
    "#2a2014",
    "#6b5538",
    "#5a4632",
    "#8a6a32",
  ],
  "counter badge on card art": ["rgba(28,19,11,0.93)", "rgba(28,19,11,0.30)"],
  "screenshot capture and error overlay, not on the board": [
    "#0f0d0a",
    "rgba(200,200,200, 0.5)",
  ],
};

const toRgb = converter("rgb");
const toOklab = converter("oklab");

/**
 * Downloads a text file. The site refuses requests without a browser user agent.
 */
export async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!response.ok) {
    throw new Error(`${url}: ${response.status}`);
  }
  return response.text();
}

/**
 * Parses any CSS colour, and clips it to the sRGB gamut.
 * culori throws on some broken input, such as a template literal, so that counts as no colour.
 */
export function parseColour(text: string): Rgba | undefined {
  const parsed = safeParse(text.trim());
  if (!parsed) {
    return undefined;
  }
  const { r, g, b, alpha } = toRgb(parsed);
  return [toByte(r), toByte(g), toByte(b), alpha ?? 1];
}

function safeParse(text: string) {
  try {
    return parse(text);
  } catch {
    return undefined;
  }
}

function toByte(channel: number): number {
  return Math.round(Math.min(1, Math.max(0, channel)) * 255);
}

/**
 * The OKLab distance between two colours, without the alpha.
 */
export function distance(first: Rgba, second: Rgba): number {
  const a = toOklab(rgbObject(first));
  const b = toOklab(rgbObject(second));
  return Math.hypot(a.l - b.l, a.a - b.a, a.b - b.b);
}

function rgbObject([r, g, b]: Rgba) {
  return { mode: "rgb" as const, r: r / 255, g: g / 255, b: b / 255 };
}

export function sameRgb(first: Rgba, second: Rgba): boolean {
  return (
    first[0] === second[0] && first[1] === second[1] && first[2] === second[2]
  );
}

export function isBlackOrWhite(colour: Rgba): boolean {
  return sameRgb(colour, [0, 0, 0, 1]) || sameRgb(colour, [255, 255, 255, 1]);
}

/**
 * Reads the colour tokens of every rule with the given selector, in file order.
 */
export function readTokens(css: string, selector: string): Map<string, Rgba> {
  const tokens = new Map<string, Rgba>();
  postcss.parse(css).walkRules((rule) => {
    if (rule.selector !== selector) {
      return;
    }
    rule.walkDecls(/^--/, (declaration) => {
      const colour = parseColour(declaration.value);
      if (colour) {
        tokens.set(declaration.prop, colour);
      }
    });
  });
  return tokens;
}

/**
 * Tokens that are opaque in both themes, change between them, and carry no fixed meaning.
 */
export function candidateTokens(
  dark: Map<string, Rgba>,
  light: Map<string, Rgba>,
): string[] {
  return [...dark].flatMap(([name, darkColour]) => {
    const lightColour = light.get(name);
    const usable =
      lightColour !== undefined &&
      !EXCLUDED_TOKENS.test(name) &&
      darkColour[3] >= 1 &&
      lightColour[3] >= 1 &&
      !sameRgb(darkColour, lightColour);
    return usable ? [name] : [];
  });
}

/**
 * The token whose dark value is nearest to the colour. On a tie, the first token in file order wins.
 */
export function nearestToken(
  colour: Rgba,
  names: readonly string[],
  dark: Map<string, Rgba>,
): Match {
  let best: Match = { token: "", distance: Infinity };
  for (const name of names) {
    const tokenColour = dark.get(name);
    if (!tokenColour) {
      continue;
    }
    const current = distance(colour, tokenColour);
    if (current < best.distance) {
      best = { token: name, distance: current };
    }
  }
  return best;
}
