import { ColorFixer } from "./inline-colors";

export enum Theme {
  light = "light",
  dark = "dark",
}

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
