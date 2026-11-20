import { defineConfig } from "wxt";

export default defineConfig({
  srcDir: "src",
  imports: false,
  outDir: process.env.WXT_ENDSTEP_LIGHT_THEME_OUT_DIR ?? ".output",
  manifestVersion: 3,
  manifest: ({ browser }) => ({
    host_permissions: ["https://endstep.cc/*"],
    permissions: ["storage"],
    ...(browser === "firefox"
      ? {
          browser_specific_settings: {
            gecko: {
              id: "endstep-light-theme@darrigo.g",
              data_collection_permissions: {
                required: ["none"],
              },
            },
          },
        }
      : {}),
  }),
});
