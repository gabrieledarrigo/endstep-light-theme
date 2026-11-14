import lightTheme from "./light.css?inline";
import { ColorFixer } from "./inline-colors";

export enum Theme {
  light = "light",
  dark = "dark",
}

/**
 * Selectors for elements to skip when applying the theme.
 */
export const SKIP_SELECTORS = [
  '[data-testid="card-text-fallback"]',
  '[data-testid="effect-plaque"]',
  "[data-stack-item-kind]",
];

export class ThemeHandler {
  constructor(private readonly fixer: ColorFixer) {
    this.createStyleElement();
  }

  /**
   * Apply the specified theme to the document.
   * Starts or stops the color fixer based on the theme.
   * @param theme The theme to apply (light or dark).
   */
  public apply(theme: Theme): void {
    if (theme === Theme.light) {
      document.documentElement.setAttribute("data-elt-theme", theme);
      this.fixer.start();
    } else {
      document.documentElement.removeAttribute("data-elt-theme");
      this.fixer.stop();
    }
  }

  /**
   * Creates and appends a style element for the light theme to the document.
   */
  private createStyleElement() {
    const style = document.createElement("style");
    style.setAttribute("id", "elt-theme");
    style.textContent = lightTheme;

    document.documentElement.append(style);
  }
}
