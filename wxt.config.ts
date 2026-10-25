import { defineConfig } from "wxt";

export default defineConfig({
  srcDir: "src",
  outDir: process.env.WXT_ENDSTEP_LIGHT_THEME_OUT_DIR ?? ".output",
});
