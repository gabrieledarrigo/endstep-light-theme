import { defineConfig } from "wxt";

export default defineConfig({
  outDir: process.env.WXT_ENDSTEP_LIGHT_THEME_OUT_DIR ?? ".output",
});
