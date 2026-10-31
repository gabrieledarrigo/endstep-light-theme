import { describe, it, expect, afterEach } from "vitest";
import { ColorFixer } from "./inline-colors";
import { INLINE_COLORS } from "./inline-colors";

describe("ColorFixer", () => {
  const [dark, light] = [...INLINE_COLORS][0]!;

  function createElement(): Element {
    const element = document.createElement("div");
    element.setAttribute("style", `color: ${dark}`);
    document.body.append(element);

    return element;
  }

  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("start", () => {
    it("fixes the colors already in the page when it starts", () => {
      const fixer = new ColorFixer();

      const element = createElement();

      fixer.start();

      expect(element.getAttribute("style")).toBe(`color: ${light}`);

      fixer.stop();
    });

    it("fixes the colors after an element is added to the document", async () => {
      const fixer = new ColorFixer();
      fixer.start();

      const element = createElement();
      expect(element.getAttribute("style")).toBe(`color: ${dark}`);

      await Promise.resolve();

      expect(element.getAttribute("style")).toBe(`color: ${light}`);

      fixer.stop();
    });

    it("fixes the colors after the style of an alement changes", async () => {
      const fixer = new ColorFixer();
      fixer.start();

      const element = createElement();
      expect(element.getAttribute("style")).toBe(`color: ${dark}`);

      await Promise.resolve();
      element.setAttribute("style", `color: ${dark}`);

      await Promise.resolve();

      expect(element.getAttribute("style")).toBe(`color: ${light}`);

      fixer.stop();
    });

    it("skips element with the given selector", async () => {
      const element = createElement();
      element.setAttribute("id", "skip");

      const fixer = new ColorFixer(['[id="skip"]']);
      fixer.start();

      await Promise.resolve();

      expect(element.getAttribute("style")).toBe(`color: ${dark}`);

      fixer.stop();
    });
  });

  describe("stop", () => {
    it("restores the old color", async () => {
      const fixer = new ColorFixer();
      const element = createElement();

      fixer.start();

      await Promise.resolve();

      fixer.stop();

      await Promise.resolve();

      expect(element.getAttribute("style")).toBe(`color: ${dark}`);
    });

    it("preserves the styles outside the colors", async () => {
      const fixer = new ColorFixer();
      const element = createElement();

      fixer.start();

      await Promise.resolve();

      element.setAttribute("style", "width: 100px");
      fixer.stop();

      await Promise.resolve();

      expect(element.getAttribute("style")).toBe("width: 100px");
    });
  });

  describe("replaceColors", () => {
    it.each([...INLINE_COLORS.keys()])(
      "should replace the original color: %s of the given style using the inline-colors map",
      (color) => {
        const style = `background-color: ${color}`;

        const expected = `background-color: ${INLINE_COLORS.get(color)}`;

        expect(ColorFixer.replaceColors(style)).toEqual(expected);
      },
    );

    it("should keep the original color if its not mapped", () => {
      const style = `background-color: red`;

      const expected = `background-color: red`;

      expect(ColorFixer.replaceColors(style)).toEqual(expected);
    });
  });
});
