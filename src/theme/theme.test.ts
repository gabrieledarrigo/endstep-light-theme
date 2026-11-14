import { describe, it, expect } from "vitest";
import { ThemeHandler, Theme } from "./theme";
import { ColorFixer } from "./inline-colors";

describe("ThemeHandler", () => {
  describe("apply", () => {
    it("should apply the light theme", () => {
      const handler = new ThemeHandler(new ColorFixer());
      handler.apply(Theme.light);

      expect(document.documentElement.getAttribute("data-elt-theme")).toBe(
        "light",
      );
    });

    it("should remove the light theme", () => {
      const handler = new ThemeHandler(new ColorFixer());

      handler.apply(Theme.dark);

      expect(document.documentElement.getAttribute("data-elt-theme")).toBe(
        null,
      );
    });
  });
});
