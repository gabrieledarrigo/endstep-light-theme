import "./style.css";
import { browser } from "#imports";
import { Theme, themePreference } from "@/theme";

/**
 * Renders the description of the current page in the popup.
 * On other websites, it prompts the user to open endstep.cc to see the theme and it disables the theme selector.
 */
async function renderDescription() {
  const tabs = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });

  const current = tabs
    .filter((tab) => {
      return tab.url?.includes("https://endstep.cc") ?? false;
    })
    .at(0);

  const themeSelector = document.querySelector(".theme-selector")!;
  const description = document.querySelector("#description")!;

  if (!current) {
    description.innerHTML = ` Open <a href="https://endstep.cc" target="_blank" rel="noopener noreferrer" class="link">endstep.cc</a> to see the theme.`;
    themeSelector.setAttribute("disabled", "true");
  }
}

/**
 * Renders the version of the extension in the popup.
 */
function renderVersion() {
  const version = document.querySelector("#version")!;

  version.innerHTML = `v${browser.runtime.getManifest().version}`;
}

/**
 * Sets the theme value based on the stored theme in local storage.
 */
async function setThemeValue() {
  const theme = await themePreference.getValue();
  const toggle = document.querySelector(`#${theme}`);

  if (!toggle) {
    return;
  }

  (toggle as HTMLInputElement).checked = true;
}

/**
 * Handles the change event for the theme selector and updates the stored theme value accordingly.
 */
function handleThemeChange() {
  const themeSelector = document.querySelector(".theme-selector")!;

  themeSelector.addEventListener("change", (event) => {
    const { value: theme } = event.target as HTMLInputElement;

    themePreference.setValue(theme as Theme);
  });
}

(async function main() {
  await renderDescription();
  renderVersion();
  handleThemeChange();
  await setThemeValue();
})();
