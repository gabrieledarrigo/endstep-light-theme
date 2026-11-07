import { describe, it, expect } from "vitest";
import { applyTheme, Theme } from "./theme";
import { ColorFixer } from "./inline-colors";

describe("theme", () => {
  describe("applyTheme", () => {
    it("should apply the light theme", () => {
      applyTheme(Theme.light, new ColorFixer());

      expect(document.documentElement.getAttribute("data-elt-theme")).toBe(
        "light",
      );
    });

    it("should remove the light theme", () => {
      applyTheme(Theme.dark, new ColorFixer());

      expect(document.documentElement.getAttribute("data-elt-theme")).toBe(
        null,
      );
    });
  });
});
