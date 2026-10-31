import { defineContentScript } from "#imports";
import {
  applyTheme,
  CARD_ART_SELECTORS,
  ColorFixer,
  lightTheme,
  Theme,
} from "@/theme";

export default defineContentScript({
  matches: ["https://endstep.cc/*"],
  runAt: "document_start",
  main() {
    const style = document.createElement("style");
    style.setAttribute("id", "elt-theme");
    style.textContent = lightTheme;

    document.documentElement.append(style);

    applyTheme(Theme.light, new ColorFixer(CARD_ART_SELECTORS));
  },
});
