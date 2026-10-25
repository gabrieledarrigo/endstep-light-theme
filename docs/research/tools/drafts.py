"""Derive three light-theme drafts from the extracted endstep.cc dark palette.
Reads research/original-palette.css, writes research/drafts/*.css and a JSON blob for the artifact."""
import re, json, math, sys

SRC = sys.argv[1]; OUT_DIR = sys.argv[2]; OUT_JSON = sys.argv[3]
css = open(SRC).read()

# ---------- parse ----------
def parse_block(text):
    out = {}
    for m in re.finditer(r'(--[a-zA-Z0-9_-]+):([^;]+);', text):
        out[m.group(1)] = m.group(2).strip()
    return out

sections = {}
for m in re.finditer(r'/\* --- ([a-z-]+) --- \*/\s*:root \{(.*?)\}', css, re.S):
    sections[m.group(1)] = parse_block(m.group(2))
parch_m = re.search(r'\.wr-ds-active \.wr-ds-body \{(.*?)\}', css, re.S)
parchment_site = parse_block(parch_m.group(1))

# ---------- colour maths (sRGB <-> OKLCH, no deps) ----------
def srgb_to_lin(c): return c/12.92 if c <= 0.04045 else ((c+0.055)/1.055)**2.4
def lin_to_srgb(c):
    c = max(0.0, min(1.0, c))
    return 12.92*c if c <= 0.0031308 else 1.055*(c**(1/2.4))-0.055
def rgb_to_oklab(r,g,b):
    r,g,b = srgb_to_lin(r),srgb_to_lin(g),srgb_to_lin(b)
    l = 0.4122214708*r+0.5363325363*g+0.0514459929*b
    m = 0.2119034982*r+0.6806995451*g+0.1073969566*b
    s = 0.0883024619*r+0.2817188376*g+0.6299787005*b
    l,m,s = l**(1/3),m**(1/3),s**(1/3)
    return (0.2104542553*l+0.7936177850*m-0.0040720468*s,
            1.9779984951*l-2.4285922050*m+0.4505937099*s,
            0.0259040371*l+0.7827717662*m-0.8086757660*s)
def oklab_to_rgb(L,a,b):
    l=(L+0.3963377774*a+0.2158037573*b)**3; m=(L-0.1055613458*a-0.0638541728*b)**3; s=(L-0.0894841775*a-1.2914855480*b)**3
    r= 4.0767416621*l-3.3077115913*m+0.2309699292*s
    g=-1.2684380046*l+2.6097574011*m-0.3413193965*s
    bb=-0.0041960863*l-0.7034186147*m+1.7076147010*s
    return tuple(lin_to_srgb(x) for x in (r,g,bb))
def hex_to_rgba(h):
    h=h.lstrip('#')
    if len(h) in (3,4): h=''.join(ch*2 for ch in h)
    r,g,b=int(h[0:2],16)/255,int(h[2:4],16)/255,int(h[4:6],16)/255
    a=int(h[6:8],16)/255 if len(h)==8 else 1.0
    return r,g,b,a
def to_oklch(hexv):
    r,g,b,a=hex_to_rgba(hexv); L,A,B=rgb_to_oklab(r,g,b)
    return L, math.hypot(A,B), (math.degrees(math.atan2(B,A))%360), a
def oklch(L,C,H,a=1.0):
    """L 0..1, C 0..0.4, H degrees -> hex, gamut-clipped by reducing chroma."""
    for _ in range(20):
        A=C*math.cos(math.radians(H)); B=C*math.sin(math.radians(H))
        r,g,b=oklab_to_rgb(L,A,B)
        raw=[(L+0.3963377774*A+0.2158037573*B)**3,(L-0.1055613458*A-0.0638541728*B)**3,(L-0.0894841775*A-1.2914855480*B)**3]
        rr= 4.0767416621*raw[0]-3.3077115913*raw[1]+0.2309699292*raw[2]
        gg=-1.2684380046*raw[0]+2.6097574011*raw[1]-0.3413193965*raw[2]
        bb=-0.0041960863*raw[0]-0.7034186147*raw[1]+1.7076147010*raw[2]
        if all(-0.002<=x<=1.002 for x in (rr,gg,bb)): break
        C*=0.9
    h='#%02x%02x%02x'%tuple(round(x*255) for x in (r,g,b))
    if a<0.999: h+='%02x'%round(a*255)
    return h
def parse_oklch_str(s):
    m=re.match(r'oklch\(\s*([\d.]+)%\s+([\d.]+)\s+([\d.]+)\s*(?:/\s*([\d.]+))?\)',s)
    L=float(m.group(1))/100; C=float(m.group(2)); H=float(m.group(3)); a=float(m.group(4)) if m.group(4) else 1.0
    return L,C,H,a
def norm(v):
    """any token value -> hex (oklch strings converted), or None for gradients."""
    v=v.strip()
    if v.startswith('#'): return v.lower()
    if v.startswith('oklch'): return oklch(*parse_oklch_str(v))
    return None

color = sections['color']; log = sections['log']
dark = {**color, **log}
dark_hex = {k: norm(v) for k,v in dark.items()}

# (an "inverted" draft, flipping OKLCH lightness mechanically, was tried and discarded on 2026-10-23)

# ---------- draft 2: parchment (site fragment extended) ----------
# the site's own 18 light tokens, as hex
parch = {k: norm(v) for k,v in parchment_site.items()}
P_HUE=80  # warm parchment hue
def p(L,C=0.05,H=P_HUE,a=1.0): return oklch(L,C,H,a)
parch.update({
  '--color-void':        p(0.90,0.05,85),
  '--color-accent-chrome':parch['--color-accent'],
  '--color-accent-rare': parch['--color-accent'],
  '--color-accent-glint':p(0.55,0.15,32),
  '--color-affordance':  oklch(0.48,0.11,130), '--color-affordance-soft': oklch(0.48,0.11,130,0.22),
  '--color-selection-valid': oklch(0.48,0.11,130),
  '--color-error':   oklch(0.48,0.18,28), '--color-error-ink': oklch(0.42,0.17,28), '--color-error-muted': oklch(0.88,0.05,28),
  '--color-success': oklch(0.48,0.14,145), '--color-success-muted': oklch(0.88,0.05,145),
  '--color-info':    oklch(0.48,0.16,255), '--color-info-muted': oklch(0.88,0.05,255),
  '--color-ink-secondary': oklch(0.45,0.03,250),
  '--color-combat-attack': oklch(0.50,0.17,32), '--color-combat-block': oklch(0.48,0.10,255),
  '--color-stop-opp': oklch(0.48,0.10,255), '--color-opp-turn': oklch(0.50,0.04,250),
  '--color-face-down-surface': p(0.78,0.05,75), '--color-face-down-edge': p(0.60,0.05,70),
  '--color-half-self': p(0.86,0.06,80), '--color-half-self-edge': oklch(0.38,0.135,30,0.10),
  '--color-half-opponent': oklch(0.86,0.03,240), '--color-half-opponent-edge': oklch(0.48,0.10,255,0.10),
  '--color-mk-castable': oklch(0.42,0.10,80), '--color-mk-on-stack': oklch(0.45,0.14,300), '--color-mk-target-locked': oklch(0.55,0.17,55),
  '--color-skip': oklch(0.42,0.12,255), '--color-skip-bg': oklch(0.90,0.03,255), '--color-skip-bg-deep': oklch(0.84,0.05,255), '--color-skip-border': oklch(0.62,0.08,255),
  '--color-zone-battlefield': p(0.87,0.05,80), '--color-zone-exile': oklch(0.87,0.03,300),
  '--color-zone-graveyard': oklch(0.87,0.03,350), '--color-zone-hand': oklch(0.87,0.03,240), '--color-zone-stack': p(0.86,0.06,75),
  '--color-mana-ink-dark': dark_hex['--color-mana-ink-dark'], '--color-mana-ink-light': dark_hex['--color-mana-ink-light'],
  '--log-bg': p(0.88,0.04,80), '--log-border': p(0.72,0.05,75), '--log-border-soft': oklch(0.45,0.08,75,0.25),
  '--log-gold': oklch(0.45,0.12,75), '--log-gold-soft': oklch(0.45,0.12,75,0.55), '--log-text-muted': oklch(0.48,0.04,70),
  '--log-tint-you': oklch(0.50,0.09,240,0.65), '--log-tint-you-bg': oklch(0.50,0.09,240,0.08),
  '--log-tint-opp': oklch(0.52,0.13,30,0.80), '--log-tint-opp-bg': oklch(0.52,0.13,30,0.08),
})
for k in dark_hex:
    if k not in parch: parch[k]=dark_hex[k]  # mana, series, black/white stay

# ---------- draft: light (refined from "clean neutral"; no longer tied to the original palette) ----------
# Goal: a relaxing, easy-to-read light UI. Soft warm off-white page, white panels, calm ink,
# vivid mana colours, and an airy amber accent with dark ink instead of a heavy dark gold.
N_HUE=85
def n(L,C=0.006,H=N_HUE,a=1.0): return oklch(L,C,H,a)
AMBER=(0.78,0.145,82)      # the accent as a surface (buttons, badges)
AMBER_TXT=(0.58,0.13,78)   # the accent as text or a thin border
neutral={}
neutral.update({
  '--color-void': n(0.965,0.010), '--color-surface': n(0.985,0.006), '--color-elevated': n(0.95,0.008), '--color-hover': n(0.925,0.012),
  '--color-border-subtle': n(0.935,0.006), '--color-border-default': n(0.89,0.008), '--color-border-strong': n(0.79,0.01),
  '--color-text-primary': n(0.36,0.015,70), '--color-text-secondary': n(0.52,0.014,70), '--color-text-tertiary': n(0.63,0.012,70),
  '--color-text-display': n(0.34,0.025,65), '--color-text-inverse': n(0.26,0.03,70), '--color-ink-tome': n(0.95,0.012,80),
  '--color-accent': oklch(*AMBER), '--color-accent-hover': oklch(0.72,0.15,80), '--color-accent-muted': oklch(*AMBER,0.18),
  '--color-accent-chrome': oklch(*AMBER_TXT), '--color-accent-rare': oklch(*AMBER_TXT), '--color-accent-glint': oklch(0.88,0.12,90),
  '--color-affordance': oklch(0.62,0.15,140), '--color-affordance-soft': oklch(0.62,0.15,140,0.22), '--color-selection-valid': oklch(0.62,0.15,140),
  '--color-error': oklch(0.58,0.20,27), '--color-error-ink': oklch(0.50,0.19,27), '--color-error-muted': oklch(0.94,0.035,27),
  '--color-success': oklch(0.56,0.16,148), '--color-success-muted': oklch(0.94,0.045,148),
  '--color-info': oklch(0.56,0.17,255), '--color-info-muted': oklch(0.94,0.035,255),
  '--color-warning': oklch(0.62,0.15,70), '--color-warning-muted': oklch(0.95,0.06,85),
  '--color-ink-secondary': oklch(0.50,0.03,250),
  '--color-combat-attack': oklch(0.60,0.19,30), '--color-combat-block': oklch(0.58,0.13,250),
  '--color-stop-opp': oklch(0.58,0.13,250), '--color-opp-turn': oklch(0.55,0.05,250),
  '--color-face-down-surface': n(0.86,0.012,80), '--color-face-down-edge': n(0.70,0.015,80),
  '--color-half-self': oklch(0.965,0.02,88), '--color-half-self-edge': oklch(*AMBER,0.16),
  '--color-half-opponent': oklch(0.965,0.012,245), '--color-half-opponent-edge': oklch(0.58,0.13,250,0.12),
  '--color-mk-castable': oklch(0.62,0.14,85), '--color-mk-on-stack': oklch(0.55,0.16,300), '--color-mk-target-locked': oklch(0.66,0.19,50),
  '--color-skip': oklch(0.50,0.14,255), '--color-skip-bg': oklch(0.945,0.03,255), '--color-skip-bg-deep': oklch(0.90,0.05,255), '--color-skip-border': oklch(0.70,0.09,255),
  '--color-zone-battlefield': oklch(0.955,0.012,110), '--color-zone-exile': oklch(0.955,0.018,300),
  '--color-zone-graveyard': oklch(0.955,0.016,350), '--color-zone-hand': oklch(0.955,0.018,240), '--color-zone-stack': oklch(0.955,0.025,85),
  # mana: vivid, gameplay-readable, no longer the muted originals
  '--color-mana-W': oklch(0.95,0.09,97), '--color-mana-U': oklch(0.62,0.19,252), '--color-mana-B': oklch(0.36,0.06,305),
  '--color-mana-R': oklch(0.62,0.22,30), '--color-mana-G': oklch(0.62,0.19,148), '--color-mana-gold': oklch(0.80,0.16,88),
  '--color-mana-ink-dark': oklch(0.22,0.03,70), '--color-mana-ink-light': oklch(0.98,0.01,90),
  '--log-bg': n(0.955,0.010), '--log-border': n(0.89,0.008), '--log-border-soft': oklch(*AMBER_TXT,0.25),
  '--log-gold': oklch(*AMBER_TXT), '--log-gold-soft': oklch(*AMBER_TXT,0.55), '--log-text-muted': n(0.63,0.012,70),
  '--log-tint-you': oklch(0.58,0.12,245,0.70), '--log-tint-you-bg': oklch(0.58,0.12,245,0.07),
  '--log-tint-opp': oklch(0.60,0.17,30,0.80), '--log-tint-opp-bg': oklch(0.60,0.17,30,0.07),
})
for k in dark_hex:
    if k not in neutral: neutral[k]=dark_hex[k]

# ---------- the --es-* kit tokens (newer "kit" UI: header, panels, tabs, buttons) ----------
es_all = sections['es']
es_dark = {k: norm(v) for k,v in es_all.items() if norm(v)}          # colour tokens only
es_static = {k: v for k,v in es_all.items() if not norm(v)}           # fonts, sizes, radii, motion
es_parch = {
  '--es-bg': oklch(0.90,0.05,85), '--es-bg-below': oklch(0.93,0.04,85), '--es-raise': oklch(0.86,0.06,80), '--es-raise-hi': oklch(0.82,0.07,80),
  '--es-line': oklch(0.72,0.05,78), '--es-line-strong': oklch(0.50,0.05,79),
  '--es-text': oklch(0.18,0.02,60), '--es-muted': oklch(0.40,0.04,70), '--es-display': oklch(0.22,0.04,60),
  '--es-chosen': oklch(0.78,0.07,80), '--es-chosen-edge': oklch(0.55,0.07,82),
  '--es-gold': oklch(0.45,0.13,70), '--es-gold-hi': oklch(0.40,0.13,72), '--es-gold-ink': oklch(0.97,0.03,85), '--es-gold-wash': oklch(0.45,0.13,70,0.15),
  '--es-up': oklch(0.45,0.14,145), '--es-down': oklch(0.50,0.17,32), '--es-live': oklch(0.52,0.18,32),
  '--es-select': oklch(0.48,0.12,240), '--es-select-wash': oklch(0.48,0.12,240,0.14),
  '--es-online': oklch(0.50,0.13,135), '--es-queued': oklch(0.50,0.10,245), '--es-away': oklch(0.60,0.015,80),
  '--es-acolyte': oklch(0.52,0.10,180), '--es-mage': oklch(0.58,0.13,80), '--es-archmage': oklch(0.52,0.13,310), '--es-developer': oklch(0.56,0.17,25),
  '--es-bloom': oklch(0.60,0.10,75,0.10), '--es-ember': oklch(0.55,0.12,70), '--es-ember-glow': oklch(0.55,0.12,70,0.45),
  '--es-ember-hot': oklch(0.40,0.10,80), '--es-ember-hot-glow': oklch(0.50,0.10,80,0.6),
  '--es-you-line': oklch(0.45,0.06,80,0.7), '--es-you-lift': oklch(0.20,0.02,80,0.06), '--es-you-lift-hi': oklch(0.20,0.02,80,0.10),
}
es_neutral = {
  '--es-bg': n(0.965,0.010), '--es-bg-below': n(0.945,0.010), '--es-raise': n(0.985,0.006), '--es-raise-hi': n(0.95,0.009),
  '--es-line': n(0.90,0.008), '--es-line-strong': n(0.76,0.012),
  '--es-text': n(0.36,0.015,70), '--es-muted': n(0.55,0.014,70), '--es-display': n(0.34,0.025,65),
  '--es-chosen': oklch(0.95,0.03,88), '--es-chosen-edge': oklch(0.78,0.10,85),
  '--es-gold': oklch(*AMBER), '--es-gold-hi': oklch(0.73,0.155,78), '--es-gold-ink': n(0.26,0.03,70),  # gold-hi is the site's hover fill for the gold button '--es-gold-wash': oklch(*AMBER,0.18),
  '--es-up': oklch(0.56,0.16,148), '--es-down': oklch(0.58,0.20,27), '--es-live': oklch(0.60,0.21,27),
  '--es-select': oklch(0.56,0.15,250), '--es-select-wash': oklch(0.56,0.15,250,0.14),
  '--es-online': oklch(0.60,0.16,140), '--es-queued': oklch(0.58,0.13,245), '--es-away': n(0.68,0.01),
  '--es-acolyte': oklch(0.55,0.11,180), '--es-mage': oklch(0.62,0.14,80), '--es-archmage': oklch(0.55,0.14,310), '--es-developer': oklch(0.58,0.18,25),
  '--es-bloom': oklch(0.82,0.10,85,0.14), '--es-ember': oklch(0.70,0.14,70), '--es-ember-glow': oklch(0.70,0.14,70,0.40),
  '--es-ember-hot': oklch(0.50,0.12,75), '--es-ember-hot-glow': oklch(0.60,0.12,75,0.6),
  '--es-you-line': oklch(0.58,0.08,80,0.7), '--es-you-lift': oklch(0.22,0.02,80,0.05), '--es-you-lift-hi': oklch(0.22,0.02,80,0.09),
}
for k in es_dark:
    es_parch.setdefault(k, es_dark[k]); es_neutral.setdefault(k, es_dark[k])
parch.update(es_parch); neutral.update(es_neutral)
all_keys = list(dark_hex.keys()) + list(es_dark.keys())

# ---------- write ----------
def write_css(name, mapping, note):
    lines=[f"/* Draft: {name}. {note} Generated 2026-10-23 by research/tools/drafts.py. */", ":root {", "  color-scheme: light;"]
    lines += [f"  {k}: {mapping[k]};" for k in all_keys]
    lines.append("}")
    open(f"{OUT_DIR}/{name}.css","w").write("\n".join(lines)+"\n")
write_css("parchment", parch, "The site's own 18-token deck-sheet light fragment extended to the full set.")
write_css("light", neutral, "Relaxing light UI: soft off-white, white panels, vivid mana, airy amber accent with dark ink.")

def contrast(fg,bg):
    def lum(h):
        r,g,b,_=hex_to_rgba(h); r,g,b=srgb_to_lin(r),srgb_to_lin(g),srgb_to_lin(b)
        return 0.2126*r+0.7152*g+0.0722*b
    a,b=lum(fg),lum(bg); a,b=max(a,b),min(a,b); return round((a+0.05)/(b+0.05),2)
def checks(m):
    return {"text/surface": contrast(m['--color-text-primary'],m['--color-surface']),
            "secondary/surface": contrast(m['--color-text-secondary'],m['--color-surface']),
            "accent as text/surface": contrast(m['--color-accent'],m['--color-surface']),
            "text/void": contrast(m['--color-text-primary'],m['--color-void']),
            "button ink/accent": contrast(m['--color-text-inverse'],m['--color-accent'])}

other = {name: sections[name] for name in sections if name not in ('color','log')}
json.dump({
  "dark": {"color": color, "log": log, "other": other},
  "parchment_site": parchment_site,
  "es_dark": es_dark, "es_static": es_static,
  "drafts": {"parchment": parch, "light": neutral},
  "checks": {"dark": checks(dark_hex), "parchment": checks(parch), "light": checks(neutral)},
  "order": all_keys,
}, open(OUT_JSON,"w"), indent=1)
print("tokens:", len(dark_hex), "| parchment site fragment:", len(parchment_site))
print("es colour tokens:", len(es_dark), "| es static tokens:", len(es_static))
print("contrast checks:", json.dumps({"dark":checks(dark_hex),"parchment":checks(parch),"light":checks(neutral)}))
