type FixedStyle = {
  original: string;
  fixed: string;
};

/**
 * A map of inline colors and their corresponding fixed colors.
 */
export const INLINE_COLORS: ReadonlyMap<string, string> = new Map([
  ["rgb(10, 8, 5)", "rgb(240, 236, 229)"],
  ["rgb(14, 12, 7)", "rgb(243, 238, 230)"],
  ["rgb(20, 14, 7)", "rgb(246, 243, 236)"],
  ["rgb(201, 151, 58)", "rgb(160, 112, 14)"],
  ["rgb(232, 217, 172)", "rgb(65, 53, 42)"],
  ["rgb(56, 139, 253)", "rgb(26, 115, 213)"],
  ["rgba(201, 151, 58, 0.08)", "rgba(160, 112, 14, 0.08)"],
  ["rgba(201, 151, 58, 0.18)", "rgba(160, 112, 14, 0.18)"],
  ["rgba(201, 151, 58, 0.22)", "rgba(160, 112, 14, 0.22)"],
  ["rgba(201, 151, 58, 0.28)", "rgba(160, 112, 14, 0.28)"],
  ["rgba(201, 151, 58, 0.3)", "rgba(160, 112, 14, 0.3)"],
  ["rgba(201, 151, 58, 0.35)", "rgba(160, 112, 14, 0.35)"],
  ["rgba(201, 151, 58, 0.5)", "rgba(160, 112, 14, 0.5)"],
  ["rgba(201, 151, 58, 0.55)", "rgba(160, 112, 14, 0.55)"],
  ["rgba(201, 151, 58, 0.6)", "rgba(160, 112, 14, 0.6)"],
  ["rgba(201, 151, 58, 0.7)", "rgba(160, 112, 14, 0.7)"],
  ["rgb(154, 138, 94)", "rgb(142, 136, 129)"],
  ["rgb(181, 154, 94)", "rgb(142, 136, 129)"],
  ["rgb(194, 96, 63)", "rgb(218, 68, 51)"],
  ["rgb(244, 230, 194)", "rgb(66, 60, 53)"],
  ["rgb(25, 17, 8)", "rgb(249, 243, 229)"],
  ["rgb(36, 27, 16)", "rgb(234, 230, 221)"],
  ["rgba(201, 169, 97, 0.035)", "rgba(213, 152, 0, 0.035)"],
  ["rgba(201, 169, 97, 0.07)", "rgba(213, 152, 0, 0.07)"],
  ["rgba(201, 169, 97, 0.09)", "rgba(213, 152, 0, 0.09)"],
  ["rgba(201, 169, 97, 0.1)", "rgba(213, 152, 0, 0.1)"],
  ["rgba(201, 169, 97, 0.12)", "rgba(213, 152, 0, 0.12)"],
  ["rgba(201, 169, 97, 0.16)", "rgba(213, 152, 0, 0.16)"],
  ["rgba(201, 169, 97, 0.18)", "rgba(213, 152, 0, 0.18)"],
  ["rgba(201, 169, 97, 0.2)", "rgba(213, 152, 0, 0.2)"],
  ["rgba(201, 169, 97, 0.22)", "rgba(213, 152, 0, 0.22)"],
  ["rgba(201, 169, 97, 0.24)", "rgba(213, 152, 0, 0.24)"],
  ["rgba(201, 169, 97, 0.26)", "rgba(213, 152, 0, 0.26)"],
  ["rgba(201, 169, 97, 0.28)", "rgba(213, 152, 0, 0.28)"],
  ["rgba(201, 169, 97, 0.3)", "rgba(213, 152, 0, 0.3)"],
  ["rgba(201, 169, 97, 0.55)", "rgba(213, 152, 0, 0.55)"],
  ["rgba(214, 178, 96, 0.12)", "rgba(213, 152, 0, 0.12)"],
  ["rgba(214, 178, 96, 0.14)", "rgba(213, 152, 0, 0.14)"],
  ["rgba(224, 180, 92, 0.55)", "rgba(229, 173, 52, 0.55)"],
  ["rgba(232, 200, 120, 0.1)", "rgba(246, 212, 118, 0.1)"],
  ["rgba(232, 200, 120, 0.14)", "rgba(246, 212, 118, 0.14)"],
  ["rgb(216, 199, 156)", "rgb(65, 53, 42)"],
]);

/**
 * Fixes inline colors in the document by replacing them with predefined colors.
 * Observes the DOM for changes and updates styles accordingly.
 */
export class ColorFixer {
  private fixedStyles: WeakMap<Element, FixedStyle>;

  private observer: MutationObserver;

  private readonly skipSelector: string;

  constructor(skip: string[] = []) {
    this.fixedStyles = new WeakMap<Element, FixedStyle>();
    this.observer = new MutationObserver((mutations) =>
      this.handleMutation(mutations),
    );
    this.skipSelector = skip.join(",");
  }

  /**
   * Starts observing the document for inline color changes and fixes them.
   */
  public start(): void {
    this.fixTree(document.documentElement);

    this.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributeFilter: ["style"],
    });
  }

  /**
   * Stops observing the document for inline color changes and restores original styles.
   */
  public stop(): void {
    this.observer.disconnect();
    document
      .querySelectorAll("[style]")
      .forEach((element) => this.restoreElement(element));
  }

  /**
   * Replaces inline colors in the given style string with predefined colors.
   * @param style The CSS style string to process.
   * @returns The style string with colors replaced.
   */
  public static replaceColors(style: string): string {
    return style.replace(
      /rgba?\([^)]*\)/g,
      (colour) => INLINE_COLORS.get(colour) ?? colour,
    );
  }

  /**
   * Handles mutations observed in the DOM and applies color fixes accordingly.
   * @param mutations The list of mutations to process.
   */
  private handleMutation(mutations: MutationRecord[]) {
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) {
            this.fixTree(node);
          }
        });
      }

      if (
        mutation.type === "attributes" &&
        mutation.target instanceof Element
      ) {
        this.fixElement(mutation.target);
      }
    }
  }

  /**
   * Fixes the inline colors for the given element by replacing them with predefined colors.
   * @param element The element to process.
   */
  private fixElement(element: Element) {
    const style = element.getAttribute("style");

    if (style === null) {
      this.fixedStyles.delete(element);
      return;
    }

    if (this.fixedStyles.get(element)?.fixed === style) {
      return;
    }

    if (this.skipSelector && element.closest(this.skipSelector)) {
      return;
    }

    const colors = ColorFixer.replaceColors(style);

    if (colors === style) {
      this.fixedStyles.delete(element);
      return;
    }

    this.fixedStyles.set(element, {
      original: style,
      fixed: colors,
    });

    element.setAttribute("style", colors);
  }

  /**
   * Fixes the inline colors for the given element and all its descendants.
   * @param element The root element to process.
   */
  private fixTree(element: Element): void {
    this.fixElement(element);

    element
      .querySelectorAll("[style]")
      .forEach((element) => this.fixElement(element));
  }

  /**
   * Restores the original inline colors for the given element if they were previously fixed.
   * @param element The element to restore.
   */
  private restoreElement(element: Element): void {
    const entry = this.fixedStyles.get(element);

    if (entry && element.getAttribute("style") === entry.fixed) {
      element.setAttribute("style", entry.original);
    }

    this.fixedStyles.delete(element);
  }
}
