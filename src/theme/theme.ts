import { ColorFixer } from "./inline-colors";

export enum Theme {
  light = "light",
  dark = "dark",
}

/**
 * Selectors for card art elements to skip when applying the theme.
 */
export const CARD_ART_SELECTORS = [
  '[data-testid="card-text-fallback"]',
  '[data-testid="effect-plaque"]',
];

/**
 * Apply the specified theme to the document.
 * @param theme The theme to apply (light or dark).
 */
export function applyTheme(theme: Theme, fixer: ColorFixer): void {
  if (theme === Theme.light) {
    document.documentElement.setAttribute("data-elt-theme", theme);
    fixer.start();
  } else {
    document.documentElement.removeAttribute("data-elt-theme");
    fixer.stop();
  }
}
