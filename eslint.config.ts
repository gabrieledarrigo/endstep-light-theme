import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig({
  files: ["src/**/*.{js,ts}", "e2e/**/*.ts"],
  extends: [js.configs.recommended, tseslint.configs.recommended],
  rules: {
    "no-empty-pattern": [
      "error",
      {
        allowObjectPatternsAsParameters: true,
      },
    ],
  },
});
