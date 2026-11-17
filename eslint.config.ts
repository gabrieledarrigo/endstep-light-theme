import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

const networkAPIs = ["fetch", "XMLHttpRequest", "WebSocket"];
const globalObjects = ["window", "globalThis", "self"];
const noNetworkAPIsMessage =
  "The extension makes no network request. See PRIVACY.md.";

export default defineConfig(
  {
    files: ["src/**/*.{js,ts}", "e2e/**/*.ts"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    rules: {
      "no-empty-pattern": [
        "error",
        {
          allowObjectPatternsAsParameters: true,
        },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["src/**/*.{js,ts}"],
    rules: {
      "no-restricted-globals": [
        "error",
        ...networkAPIs.map((name) => ({
          name,
          message: noNetworkAPIsMessage,
        })),
      ],
      "no-restricted-properties": [
        "error",
        ...globalObjects.flatMap((object) =>
          networkAPIs.map((name) => ({
            object,
            property: name,
            message: noNetworkAPIsMessage,
          })),
        ),
      ],
    },
  },
);
