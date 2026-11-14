import { defineContentScript } from "#imports";
import {
  SKIP_SELECTORS,
  ColorFixer,
  themePreference,
  ThemeHandler,
} from "@/theme";

export default defineContentScript({
  matches: ["https://endstep.cc/*"],
  runAt: "document_start",
  async main() {
    const theme = await themePreference.getValue();

    const fixer = new ColorFixer(SKIP_SELECTORS);
    const handler = new ThemeHandler(fixer);
    handler.apply(theme);

    themePreference.watch((newTheme) => {
      handler.apply(newTheme);
    });
  },
});
