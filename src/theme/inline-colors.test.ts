import { describe, it, expect, afterEach, beforeEach } from "vitest";
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

  let fixer: ColorFixer;

  beforeEach(() => {
    fixer = new ColorFixer();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("start", () => {
    it("fixes the colors already in the page when it starts", () => {
      const element = createElement();

      fixer.start();

      expect(element.getAttribute("style")).toBe(`color: ${light}`);
    });

    it("fixes the colors after an element is added to the document", async () => {
      fixer.start();

      const element = createElement();
      expect(element.getAttribute("style")).toBe(`color: ${dark}`);

      await Promise.resolve();

      expect(element.getAttribute("style")).toBe(`color: ${light}`);
    });

    it("fixes the colors after the style of an alement changes", async () => {
      fixer.start();

      const element = createElement();
      expect(element.getAttribute("style")).toBe(`color: ${dark}`);

      await Promise.resolve();
      element.setAttribute("style", `color: ${dark}`);

      await Promise.resolve();

      expect(element.getAttribute("style")).toBe(`color: ${light}`);
    });
  });

  describe("stop", () => {
    it("restores the old color", async () => {
      const element = createElement();

      fixer.start();

      await Promise.resolve();

      fixer.stop();

      await Promise.resolve();

      expect(element.getAttribute("style")).toBe(`color: ${dark}`);
    });

    it("preserves the styles outside the colors", async () => {
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
