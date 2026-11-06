import { defineContentScript } from "#imports";
import {
  applyTheme,
  SKIP_SELECTORS,
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

    applyTheme(Theme.light, new ColorFixer(SKIP_SELECTORS));
  },
});
