# WXT and the stores

This page explains what WXT does for releases, and what you must do once by hand.

## What WXT does

WXT is the build tool of this project. For a release it does three things:

1. `npm run build` compiles the TypeScript and writes one folder per browser, with the right manifest in each.
2. `npm run zip` packs each folder into a zip, ready for upload.
3. `npx wxt submit` uploads the zips to the Chrome Web Store and to Firefox Add-ons. It needs store credentials.

The release workflow runs these three commands. The third runs only when the credentials exist as repository secrets.

## What you must do once

### 1. Chrome Web Store account

1. Open https://chrome.google.com/webstore/devconsole and sign in with a Google account.
2. Pay the one-time registration fee (5 USD).
3. Fill in the publisher name and the contact email, and verify the email.

### 2. Firefox Add-ons account

1. Open https://addons.mozilla.org and create an account.
2. Open https://addons.mozilla.org/developers/ and accept the developer agreement.

### 3. First upload by hand

The first upload of each store is manual. The stores create the extension id at that moment, and the automation needs that id.

For each store:

1. Download the zip from the first GitHub Release.
2. Upload it in the store dashboard as a new item.
3. Fill in the listing: name, short description, a 128 px icon, at least one screenshot (1280 x 800 px), and the privacy policy link. The link is the `PRIVACY.md` file on GitHub.
4. Submit for review. Chrome takes from hours to days. Firefox takes from minutes to days.

### 4. Credentials for the automation

Run `npx wxt submit init` in the repository. It asks questions and tells you where to click to create each credential.

At the end you have seven values. Add them as repository secrets in GitHub, under Settings, Secrets and variables, Actions:

- `CHROME_EXTENSION_ID`
- `CHROME_CLIENT_ID`
- `CHROME_CLIENT_SECRET`
- `CHROME_REFRESH_TOKEN`
- `FIREFOX_EXTENSION_ID`
- `FIREFOX_JWT_ISSUER`
- `FIREFOX_JWT_SECRET`

From the next tag, the release workflow uploads the zips by itself.

## When to do this

Not now. The accounts are useful at the "Release" milestone. Everything before it works without them.
