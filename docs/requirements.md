# Requirements

Every requirement links to its GitHub issue. The issue is the source of truth.
Project board: https://github.com/users/gabrieledarrigo/projects/3

## Goal

The extension sets a light theme on every page of endstep.cc.

The extension shows a toggle. The toggle activates the light theme. The default is on.
If the toggle is off, the extension shows the original theme of the site.

Supported browsers: Chrome and Firefox.

## Technical choices

- Language: TypeScript with strict type checking.
- Package manager: npm.
- Unit tests: Vitest.
- End-to-end tests: Playwright, in Chrome.
- Linting: ESLint. Formatting: Prettier.
- Popup: plain HTML, CSS, and TypeScript. No UI framework.
- Build tool: WXT. It generates the manifests for Chrome and Firefox, reloads during development, and builds the release zips.

## Functional requirements

### Set up the project

Issue: [#1](https://github.com/gabrieledarrigo/endstep-light-theme/issues/1)

As a maintainer, I want the repository and the checks ready, so that every later issue only adds features.

Acceptance criteria:

- [ ] `npm install` followed by `npm run build` produces a Chrome build and a Firefox build.
- [ ] `npm run dev` opens Chrome with the extension loaded and reloads it on every change.
- [ ] `npm run lint`, `npm run format:check`, `npm run typecheck`, and `npm test` pass on a clean checkout.
- [ ] `npm run test:e2e` runs a Playwright test in Chrome with the extension loaded.
- [ ] A GitHub Actions workflow runs these commands on every pull request and on every push to `main`.
- [ ] The repository has the labels, the milestones, the project board, and branch protection on `main`.

Technical tasks:

1. Create the WXT project in the repository root with `npx wxt@latest init . --template vanilla --pm npm`. Keep the existing `package.json` fields: name, description, license, author. Set `srcDir: "src"` in `wxt.config.ts`, so that all source files live in `src/`.
2. Enable strict TypeScript in `tsconfig.json`: `"strict": true` and `"noUncheckedIndexedAccess": true`.
3. Add ESLint with the TypeScript plugin and Prettier. Add the scripts `lint`, `format`, `format:check`, and `typecheck`.
4. Add Vitest with the WXT testing helpers. Add the script `test`. Add one unit test so that the script runs.
5. Add Playwright with the Chromium browser only. Add the script `test:e2e`. Add one test that loads the built extension and opens `https://endstep.cc`.
6. Add the scripts `dev`, `build` (both browsers), and `zip` (both browsers). WXT reads the version from `package.json`.
7. Create `.github/workflows/ci.yml`. Trigger: pull requests and pushes to `main`. Steps: checkout, Node LTS, `npm ci`, lint, format check, typecheck, unit tests, build, install Chromium for Playwright, end-to-end tests.
8. Create the labels: `feature`, `bug`, `chore`, `docs`, `chrome`, `firefox`, `enhancement`, `won't fix`. Delete every other label.
9. Create the milestones: "Set up", "Light theme", "Toggle and popup", "Fail safe and no flash", "Release".
10. Create the GitHub Project and link the repository.
11. Protect `main`: require a pull request and the CI workflow to pass before merge.
12. Write a short `README.md`: what the extension does, how to install for development, how to run the checks.

### Light theme on every page

Issue: [#2](https://github.com/gabrieledarrigo/endstep-light-theme/issues/2)

As a player, I want every page of endstep.cc in the light theme, so that the site is comfortable to read.

Acceptance criteria:

- [ ] The light theme is the one defined in `docs/research/drafts/light.css`.
- [ ] Every page of endstep.cc uses the light theme: home, events, decks, metagame, profile, and the game board.
- [ ] Colours that the site sets with JavaScript, such as inline styles on the game board, also follow the light theme.
- [ ] Mana symbols and the series colours of charts stay readable and keep their meaning.
- [ ] Browser controls on the page, such as scrollbars and form fields, use the light scheme.

Technical tasks:

1. Create `src/theme/light.css` from `docs/research/drafts/light.css`. Wrap every rule in the selector `html[data-elt-theme="light"]`. Add `color-scheme: light` to that selector.
2. Create the content script `src/entrypoints/endstep.content.ts`. Options: `matches: ["https://endstep.cc/*"]`, `runAt: "document_start"`.
3. In the content script, import the CSS as text with `?inline`. Insert a `<style id="elt-theme">` element into `document.documentElement` as the first action.
4. Set the attribute `data-elt-theme="light"` on `<html>` when the theme is on. Remove the attribute when the theme is off. The CSS applies only while the attribute is present.
5. Create `src/theme/inline-colors.ts`: a map from each dark colour that the site writes in `style` attributes to its light replacement. Collect the dark colours from the game view bundle with a script in `docs/research/tools/`. Store the script in the repository.
6. Create `src/theme/inline-fixer.ts`. It starts a `MutationObserver` on `document.documentElement` with `subtree`, `childList`, and `attributeFilter: ["style"]`. For every element with a `style` attribute, it replaces each colour found in the map. It marks the element with `data-elt-fixed` so that it does not loop.
7. Start the fixer when the theme is on. Stop it and restore the original `style` values when the theme is off. Keep the original value in a `WeakMap`.
8. Add unit tests for the colour map and for the fixer, with a fake DOM in Vitest.
9. Add an end-to-end test. It loads the extension, opens `https://endstep.cc/`, and checks that the computed background of `<body>` matches the light `--color-void`.
10. Add a manual checklist to `docs/manual-checks.md`: the pages and the game board states to look at before a release.

### Theme toggle in a popup

Issue: [#3](https://github.com/gabrieledarrigo/endstep-light-theme/issues/3)

As a player, I want a switch in the extension popup, so that I can turn the light theme on or off.

Acceptance criteria:

- [ ] A click on the extension icon in the browser toolbar opens a popup.
- [ ] The popup shows the extension name, a switch, a short explanation, and a link to the GitHub issues page.
- [ ] On a fresh install the switch is on and endstep.cc shows the light theme.
- [ ] If the user turns the switch off, every open endstep.cc tab shows the original theme at once, without a reload.
- [ ] If the user turns the switch on, every open endstep.cc tab shows the light theme at once, without a reload.
- [ ] The popup is designed so that more themes can be added later.
- [ ] If the active tab is not on endstep.cc, the popup shows "Open endstep.cc to see the theme" instead of the control.
- [ ] The popup shows the extension version in small text.
- [ ] The visual design follows the design file. _The design is in progress._

Technical tasks:

1. Create `src/entrypoints/popup/index.html`, `src/entrypoints/popup/main.ts`, and `src/entrypoints/popup/style.css`.
2. Build the control as a radio group: a `<fieldset>` with `role="radiogroup"`, one `<input type="radio">` per theme, and a visible `<label>` per option. Values: `light`, `dark`.
3. Read the current choice with `storage.getItem("local:theme")` and check the matching radio.
4. On change, write the new value with `storage.setItem("local:theme", value)`. The content scripts react to the change (see "Remember the choice").
5. Find the active tab with `browser.tabs.query({ active: true, currentWindow: true })`. If its URL does not start with `https://endstep.cc/`, hide the control and show the message. The URL is available because the extension has the host permission for endstep.cc.
6. Show the version from `browser.runtime.getManifest().version`.
7. Add the link to `https://github.com/gabrieledarrigo/endstep-light-theme/issues` with `target="_blank"`.
8. Keep the list of themes in one array in `src/themes.ts`. The popup renders one option per entry.
9. Add an end-to-end test: open the popup page of the built extension, select "dark", and check that an open endstep.cc tab lost the `data-elt-theme` attribute without a reload.

### Remember the choice

Issue: [#4](https://github.com/gabrieledarrigo/endstep-light-theme/issues/4)

As a player, I want the extension to remember my choice, so that I do not set it again.

Acceptance criteria:

- [ ] If the user closes and reopens the browser, the last choice is still active.
- [ ] The choice is stored in the browser. It is not synced to other devices.

Technical tasks:

1. Create `src/storage.ts`. Define the item with `storage.defineItem<"light" | "dark">("local:theme", { fallback: "light" })` from `wxt/storage`. The `local:` prefix means browser-local storage, not synced.
2. In the content script, read the item at start and set or remove the `data-elt-theme` attribute.
3. In the content script, subscribe with `theme.watch(value => ...)` and set or remove the attribute on every change. This updates every open endstep.cc tab at once.
4. Add a unit test with the fake storage of WXT: the fallback is `light`, a write is read back, and a watcher fires on change.
5. Add an end-to-end test: select "dark", close the browser context, open a new one with the same profile directory, and check that endstep.cc opens dark.

### Release flow

Issue: [#5](https://github.com/gabrieledarrigo/endstep-light-theme/issues/5)

As a maintainer, I want a release built and published from a git tag, so that a release is one command.

Acceptance criteria:

- [ ] A push of a tag `v*` builds one zip for Chrome and one for Firefox.
- [ ] The workflow creates a GitHub Release for the tag and attaches the two zips.
- [ ] The release notes list the merged pull requests, grouped by label.
- [ ] If the store secrets exist, the workflow uploads the zips to the Chrome Web Store and to Firefox Add-ons.
- [ ] If the store secrets do not exist, the workflow skips the upload and still succeeds.

Technical tasks:

1. Create `.github/workflows/release.yml`. Trigger: tags `v*`. Steps: checkout, Node LTS, `npm ci`, `npm run zip`.
2. Create the release with `gh release create` and `--generate-notes`, and attach the zips from `.output/`.
3. Create `.github/release.yml` so that the generated notes group pull requests by label: `feature` and `enhancement` as "New", `bug` as "Fixed", `chore` and `docs` as "Other".
4. Add a step that runs `npx wxt submit` with the secrets listed in `docs/stores.md`. Add an `if` condition so that the step runs only when `CHROME_EXTENSION_ID` is set.
5. Document the release steps in `README.md`: bump the version in `package.json` in a pull request, merge, tag `vX.Y.Z` on `main`, push the tag.
6. Test the workflow with a tag `v0.1.0` once the theme and the toggle are merged.

## Non-functional requirements

### Minimal permissions

Issue: [#6](https://github.com/gabrieledarrigo/endstep-light-theme/issues/6)

As a player, I want the extension to ask only for what it needs, so that I can trust it.

Acceptance criteria:

- [ ] The manifest requests access to `https://endstep.cc/*` only.
- [ ] The manifest requests the `storage` permission and no other permission.
- [ ] The extension makes no network request.
- [ ] The extension collects no personal data.

Technical tasks:

1. In `wxt.config.ts`, set `manifest.permissions` to `["storage"]` and `manifest.host_permissions` to `["https://endstep.cc/*"]`.
2. Do not add a background script. The popup and the content scripts talk through storage only.
3. Add a unit test that reads the built manifest for Chrome and for Firefox and checks the two lists above exactly.
4. Add an ESLint rule that reports `fetch`, `XMLHttpRequest`, and `WebSocket` in `src/`.
5. Write a `PRIVACY.md` with one paragraph: the extension stores one setting in the browser and sends nothing anywhere. The stores ask for this text.

### Supported browsers

Issue: [#7](https://github.com/gabrieledarrigo/endstep-light-theme/issues/7)

As a player, I want the extension to work in my browser, so that I can use it without an update.

Acceptance criteria:

- [ ] The extension works in the current stable version of Chrome and in the one before it.
- [ ] The extension works in the current stable version of Firefox and in the one before it.
- [ ] The manifest uses Manifest V3.

Technical tasks:

1. WXT builds Manifest V3 by default. Keep the default.
2. In `wxt.config.ts`, set `manifest.minimum_chrome_version` and `manifest.browser_specific_settings.gecko.strict_min_version` to the stable version before the current one. Update both values at every release.
3. Add `browser_specific_settings.gecko.id` with a fixed id such as `light-theme@endstep.darrigo.dev`. Firefox needs it for signing.
4. Write the two version numbers in `README.md` under "Supported browsers".
5. Add a Firefox item to `docs/manual-checks.md`: load the build with `npm run dev:firefox` and run the checklist once per release. End-to-end tests run in Chrome only.

### Fail safe when the site changes

Issue: [#8](https://github.com/gabrieledarrigo/endstep-light-theme/issues/8)

As a player, I want a readable page even after endstep.cc changes, so that the extension never breaks the site.

Acceptance criteria:

- [ ] The extension keeps a list of the colour tokens that the light theme needs.
- [ ] On every page load, the extension checks that the site still defines these tokens.
- [ ] If one or more tokens are missing, the extension shows the original theme of the site.
- [ ] In that case, the popup shows the message "endstep.cc changed and the light theme can't be applied" and the feedback link.
- [ ] If all tokens are present, the extension applies the light theme as usual.

Technical tasks:

1. Create `src/theme/required-tokens.ts` with the list of tokens the theme needs. Start with: `--color-void`, `--color-surface`, `--color-text-primary`, `--color-accent`, `--es-bg`, `--es-raise`, `--es-text`, `--es-gold`, `--log-bg`.
2. In the content script, on the `load` event, read `getComputedStyle(document.documentElement).getPropertyValue(token)` for each token. A token is missing when the value is an empty string.
3. If one or more tokens are missing, remove the `data-elt-theme` attribute, stop the inline fixer, and keep a `siteChanged` flag in the content script.
4. Answer the message `{ type: "status" }` from the popup with `{ siteChanged: boolean }` through `browser.runtime.onMessage`.
5. In the popup, send the status message to the active tab with `browser.tabs.sendMessage`. If `siteChanged` is true, show the message "endstep.cc changed and the light theme can't be applied" and the feedback link, and disable the control.
6. Add a unit test for the check function with a fake `getComputedStyle`.
7. Add an end-to-end test that serves a copy of the site with one token removed and checks that `<body>` keeps the dark background.

### No flash of the dark theme

Issue: [#9](https://github.com/gabrieledarrigo/endstep-light-theme/issues/9)

As a player, I want the page to open in the light theme from the first frame, so that I see no dark flash.

Acceptance criteria:

- [ ] If the light theme is on, the first painted frame of an endstep.cc page is light.
- [ ] If the light theme is on, elements with colours set by JavaScript never show a dark colour in a painted frame.
- [ ] If the light theme is off, the extension does not change the first painted frame.

Technical tasks:

1. Keep `runAt: "document_start"` on the content script. At that moment the page has no body yet and nothing is painted.
2. Insert the `<style>` element synchronously, before any `await`. The style is inert until the attribute is set.
3. Read the stored choice right after. The read takes a few milliseconds. The browser cannot paint before the site's main stylesheet has downloaded, which takes longer, so the attribute is set before the first paint.
4. Start the inline fixer before the first `await` as well, so that it sees every element the site creates.
5. Add an end-to-end test that registers an init script with `page.addInitScript`. The script records, on the first `requestAnimationFrame`, the computed background of `<html>`. The test checks that the recorded value is light when the theme is on and dark when it is off.
6. If the fail safe triggers after `load`, a short light-to-dark change is accepted. Note this in `docs/manual-checks.md`.
