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

### 4. Chrome service account

The Chrome Web Store API v2 uses a Google Cloud service account. Follow the guide at https://developer.chrome.com/docs/webstore/service-accounts.

1. Open https://console.cloud.google.com and create a project.
2. Enable the "Chrome Web Store API" in the project.
3. Create a service account. It needs no roles.
4. Open the Chrome Web Store dashboard, go to Account, and add the email of the service account.
5. In the Cloud Console, open the service account, go to Keys, and create a JSON key.

### 5. Credentials for the automation

1. Run `npx wxt submit init`. Choose the API version `v2`.
2. If it asks for the service account, copy the `client_email` and `private_key` fields from the JSON key.
3. The command writes the values to `.env.submit`. Git ignores this file. Do not commit it.
4. Add these seven values as repository secrets in GitHub, under Settings, Secrets and variables, Actions:
   - `CHROME_EXTENSION_ID`
   - `CHROME_PUBLISHER_ID`
   - `CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL`
   - `CHROME_SERVICE_ACCOUNT_PRIVATE_KEY`
   - `FIREFOX_EXTENSION_ID`
   - `FIREFOX_JWT_ISSUER`
   - `FIREFOX_JWT_SECRET`
5. Run `npm run zip`, then check the credentials with `npx wxt submit --dry-run` and the three zip flags. The command reads `.env.submit`.
6. Delete the JSON key file.

`.env.example` lists every variable that `npx wxt submit init` writes. It contains no secret values.

From the next tag, the release workflow uploads the zips by itself.
