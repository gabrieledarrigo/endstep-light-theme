"""Collect the colours that the endstep.cc game view writes in inline styles, and map them to the light theme.

Usage: python3 docs/research/tools/inline_colors.py OUT_DIR

Downloads the GameView chunk and the chunks it imports into OUT_DIR/bundles,
writes the full report to OUT_DIR/inline-colors.json,
and prints the TypeScript map for src/theme/inline-colors.ts.

Every colour literal is put in one category, from the code around it:
  style       a value that ends in a `style` attribute (React style object or cssText). The inline fixer handles these.
  stylesheet  CSS text that the site puts in a <style> element. The fixer does not see it; light.css must handle it.
  class       a Tailwind arbitrary class such as `text-[#a08658]`. It lives in the site's stylesheet, so light.css must handle it.
  svg         an SVG presentation attribute (fill, stroke, stopColor). The fixer does not see it; light.css can override it.
  fallback    the fallback of var(--token, colour). The token already switches, so nothing to do.
  dynamic     a colour built at runtime (`rgb(${...})`). It cannot be mapped statically.

A `style` colour is mapped to the dark token that is nearest in OKLab.
Only opaque tokens are candidates, and never the mana or chart series tokens.
If the colour is only used as a text colour, only text tokens are candidates, so the text stays readable.
The replacement is that token's light value with the alpha of the original colour.

Some `style` colours are kept as they are, listed in KEEP:
pure black and white (shadows and highlights), and colours that carry a meaning or sit on card art.

Keys and values use the form that Chrome writes in a `style` attribute: `rgb(r, g, b)` or `rgba(r, g, b, a)`.
"""
import json
import math
import re
import sys
import urllib.request
from pathlib import Path

SITE = "https://endstep.cc"
ROOT = Path(__file__).resolve().parents[3]
DARK_TOKENS = ROOT / "docs/research/original-palette.css"
LIGHT_TOKENS = ROOT / "src/theme/light.css"
EXACT = 0.01
NEAR = 0.05
EXCLUDED_TOKENS = re.compile(r"^--color-(mana|series)-")
TEXT_TOKENS = re.compile(r"^--(color-text-|es-(text|muted|display)$|log-text-)")
TEXT_PROPERTY = re.compile(r"(?:^|[{,;\s])(color|text)\s*:\s*`?$")

KEEP = {
    "shadows and highlights": ["#000", "#fff", "#ffffff"],
    "mana symbols": ["#f5f0d8", "#2a6db0", "#39323d", "#b03a2e", "#2f7d43", "#b9b2a6"],
    "player colours": ["#8a6f4a", "#4a6f8a", "#6f8a4a", "#8a4a5f", "#6a5a8a", "#4a8a7f"],
    "damage, life and gain numbers": [
        "#c0553a", "#7a9b4e", "#2ea043",
        "rgba(192,85,58,0.45)", "rgba(122,155,78,0.45)", "rgba(46,160,67,0.45)",
    ],
    "turn jewels": [
        "rgba(255,245,210,.55)", "rgba(220,235,255,.55)",
        "#f3d99a", "#e6b35a", "#7a5520", "#f0c878", "#a8c6e8", "#7da3d1", "#5a7fb0", "#2c4566",
    ],
    "card backs in piles": ["#4a3a28", "#2e2418", "#1a1410", "#3a2e1e", "#2a2014", "#6b5538", "#5a4632", "#8a6a32"],
    "counter badge on card art": ["rgba(28,19,11,0.93)", "rgba(28,19,11,0.30)"],
    "screenshot capture and error overlay, not on the board": ["#0f0d0a", "rgba(200,200,200, 0.5)"],
}

COLOUR = re.compile(r"#[0-9a-fA-F]{3,8}\b|rgba?\([^()]*\)|oklch\([^()]*\)")
TOKEN = re.compile(r"(--[\w-]+)\s*:\s*([^;]+);")
SVG_ATTRIBUTE = re.compile(r"(fill|stroke|stopColor|floodColor|lightingColor)\s*:\s*`$")
CLASS_TOKEN = re.compile(r"[\w:/.-]*\[[^\s`\"]*$")


def fetch(url):
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request) as response:
        return response.read().decode("utf-8")


def download_bundles(out_dir):
    """Download the GameView chunk and its static imports. Returns {file name: source}."""
    home = fetch(SITE + "/")
    main_name = re.search(r'src="/assets/(main-[\w-]+\.js)"', home).group(1)
    main = fetch(f"{SITE}/assets/{main_name}")
    game_name = re.search(r"(GameView-[\w-]+\.js)", main).group(1)
    game = fetch(f"{SITE}/assets/{game_name}")
    names = [game_name] + sorted(set(re.findall(r'from"\./([\w.-]+\.js)"', game)) - {main_name})
    bundles = {game_name: game}
    for name in names[1:]:
        bundles[name] = fetch(f"{SITE}/assets/{name}")
    bundle_dir = out_dir / "bundles"
    bundle_dir.mkdir(parents=True, exist_ok=True)
    for name, source in bundles.items():
        (bundle_dir / name).write_text(source)
    return bundles


def srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def linear_to_srgb(c):
    c = max(0.0, min(1.0, c))
    return 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055


def rgb_to_oklab(r, g, b):
    r, g, b = (srgb_to_linear(c / 255) for c in (r, g, b))
    l = (0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b) ** (1 / 3)
    m = (0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b) ** (1 / 3)
    s = (0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b) ** (1 / 3)
    return (
        0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
        1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
        0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
    )


def oklch_to_rgb(lightness, chroma, hue):
    a = chroma * math.cos(math.radians(hue))
    b = chroma * math.sin(math.radians(hue))
    l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
    m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
    s = (lightness - 0.0894841775 * a - 1.2914855480 * b) ** 3
    linear = (
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
    )
    return tuple(round(linear_to_srgb(c) * 255) for c in linear)


def parse_colour(text):
    """Return (r, g, b, alpha) for a hex, rgb(), rgba() or oklch() colour, or None."""
    text = text.strip()
    if text.startswith("#"):
        digits = text[1:]
        if len(digits) in (3, 4):
            digits = "".join(c * 2 for c in digits)
        if len(digits) not in (6, 8):
            return None
        alpha = int(digits[6:8], 16) / 255 if len(digits) == 8 else 1.0
        return int(digits[0:2], 16), int(digits[2:4], 16), int(digits[4:6], 16), alpha
    match = re.fullmatch(r"rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)", text)
    if match:
        r, g, b = (round(float(match.group(i))) for i in (1, 2, 3))
        return r, g, b, float(match.group(4)) if match.group(4) else 1.0
    match = re.fullmatch(r"oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*(?:/\s*([\d.]+))?\s*\)", text)
    if match:
        r, g, b = oklch_to_rgb(float(match.group(1)) / 100, float(match.group(2)), float(match.group(3)))
        return r, g, b, float(match.group(4)) if match.group(4) else 1.0
    return None


def format_alpha(alpha):
    return f"{alpha:.3f}".rstrip("0").rstrip(".") if alpha not in (0, 1) else str(int(alpha))


def serialise(r, g, b, alpha):
    """Write a colour the way Chrome writes it in a style attribute."""
    if alpha >= 1:
        return f"rgb({r}, {g}, {b})"
    return f"rgba({r}, {g}, {b}, {format_alpha(alpha)})"


def read_tokens(path, root_blocks_only):
    css = path.read_text()
    if root_blocks_only:
        css = "".join(re.findall(r":root\s*\{(.*?)\}", css, re.S))
    tokens = {}
    for name, value in TOKEN.findall(css):
        colour = parse_colour(value)
        if colour:
            tokens[name] = colour
    return tokens


def categorise(source, start, literal):
    before = source[max(0, start - 200):start]
    after = source[start + len(literal):start + len(literal) + 1]
    if "${" in literal:
        return "dynamic"
    opening = source.rfind("`", 0, start)
    closing = source.find("`", start)
    template = source[opening:closing]
    if "{" in template and "}" in template and "${" not in template:
        return "stylesheet"
    if re.search(r"var\(--[\w-]+,\s*$", before):
        return "fallback"
    if SVG_ATTRIBUTE.search(before):
        return "svg"
    if CLASS_TOKEN.search(before) and after in ("]", "_", ")", ",") and " " not in before[before.rfind("[") :]:
        return "class"
    return "style"


def collect(bundles):
    """Return {literal: {"category", "files", "count", "contexts"}}."""
    found = {}
    for name, source in bundles.items():
        for match in COLOUR.finditer(source):
            literal = match.group(0)
            category = categorise(source, match.start(), literal)
            entry = found.setdefault((literal, category), {"files": set(), "count": 0, "contexts": [], "text_only": True})
            entry["files"].add(name)
            entry["count"] += 1
            if not TEXT_PROPERTY.search(source[max(0, match.start() - 20):match.start()]):
                entry["text_only"] = False
            if len(entry["contexts"]) < 2:
                entry["contexts"].append(source[max(0, match.start() - 60):match.end() + 30])
    return found


def candidate_tokens(dark, light):
    """Tokens that are opaque in both themes, change between them, and carry no fixed meaning."""
    return [
        name for name in dark
        if name in light
        and not EXCLUDED_TOKENS.match(name)
        and dark[name][3] >= 1 and light[name][3] >= 1
        and dark[name][:3] != light[name][:3]
    ]


def nearest_token(colour, dark, candidates):
    target = rgb_to_oklab(*colour[:3])
    best = min(candidates, key=lambda name: math.dist(target, rgb_to_oklab(*dark[name][:3])))
    return best, math.dist(target, rgb_to_oklab(*dark[best][:3]))


def build_map(found, dark, light):
    kept = {literal for literals in KEEP.values() for literal in literals}
    candidates = candidate_tokens(dark, light)
    text_candidates = [name for name in candidates if TEXT_TOKENS.match(name)]
    mapping = {}
    for (literal, category), entry in found.items():
        colour = parse_colour(literal)
        if category != "style" or not colour or literal in kept or colour[:3] in ((0, 0, 0), (255, 255, 255)):
            continue
        token, distance = nearest_token(colour, dark, text_candidates if entry["text_only"] else candidates)
        key = serialise(*colour)
        mapping[key] = {
            "light": serialise(*light[token][:3], colour[3]),
            "token": token,
            "distance": round(distance, 3),
            "match": "exact" if distance < EXACT else "near" if distance < NEAR else "review",
            "literal": literal,
        }
    return dict(sorted(mapping.items(), key=lambda item: (item[1]["match"], item[0])))


def main():
    out_dir = Path(sys.argv[1])
    bundles = download_bundles(out_dir)
    dark = read_tokens(DARK_TOKENS, root_blocks_only=True)
    light = read_tokens(LIGHT_TOKENS, root_blocks_only=False)
    found = collect(bundles)
    mapping = build_map(found, dark, light)

    report = {
        "bundles": sorted(bundles),
        "map": mapping,
        "kept": KEEP,
        "literals": [
            {"literal": literal, "category": category, "count": entry["count"],
             "files": sorted(entry["files"]), "contexts": entry["contexts"]}
            for (literal, category), entry in sorted(found.items(), key=lambda item: (item[0][1], item[0][0]))
        ],
    }
    (out_dir / "inline-colors.json").write_text(json.dumps(report, indent=1))

    counts = {}
    for _, category in found:
        counts[category] = counts.get(category, 0) + 1
    print(f"bundles: {len(bundles)} | unique literals per category: {counts}", file=sys.stderr)
    print(f"map entries: {len(mapping)}", file=sys.stderr)

    print("export const inlineColors: ReadonlyMap<string, string> = new Map([")
    for key, value in mapping.items():
        print(f'  ["{key}", "{value["light"]}"],')
    print("]);")


if __name__ == "__main__":
    main()
