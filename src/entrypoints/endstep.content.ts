import { defineContentScript } from "#imports";
import { applyTheme, Theme } from "@/theme/theme";
import { ColorFixer } from "@/theme/inline-colors";
import lightTheme from "../theme/light.css?inline";

export default defineContentScript({
  matches: ["https://endstep.cc/*"],
  runAt: "document_start",
  main() {
    const style = document.createElement("style");
    style.setAttribute("id", "elt-theme");
    style.textContent = lightTheme;

    document.documentElement.append(style);

    applyTheme(Theme.light, new ColorFixer());
  },
});
