import { defineConfig } from "wxt";

export default defineConfig({
  srcDir: "src",
  imports: false,
  outDir: process.env.WXT_ENDSTEP_LIGHT_THEME_OUT_DIR ?? ".output",
});
