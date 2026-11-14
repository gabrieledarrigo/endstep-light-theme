import { storage } from "#imports";
import { Theme } from "./theme";

export const themePreference = storage.defineItem<Theme>("local:theme", {
  fallback: Theme.light,
});
