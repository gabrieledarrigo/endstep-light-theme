# WXT and the stores

This page explains what WXT does for releases, and what you must do once by hand.

## What WXT does

WXT is the build tool of this project. For a release it does three things:

1. `npm run build` compiles the TypeScript and writes one folder per browser, with the right manifest in each.
2. `npm run zip` packs each folder into a zip, ready for upload: one for Chrome, one for Firefox, one for Edge.
3. `npx wxt submit` uploads the zips to the Chrome Web Store, Firefox Add-ons, and Edge Add-ons. It needs store credentials.

The release workflow runs these three commands on every release.

If a credential is missing or wrong, the upload fails and the release workflow fails.

## What you must do once

### 1. Chrome Web Store account

1. Open https://chrome.google.com/webstore/devconsole and sign in with a Google account.
2. Pay the one-time registration fee (5 USD).
3. Fill in the publisher name and the contact email, and verify the email.

### 2. Firefox Add-ons account

1. Open https://addons.mozilla.org and create an account.
2. Open https://addons.mozilla.org/developers/ and accept the developer agreement.

### 3. Edge Add-ons account

1. Open https://partner.microsoft.com/dashboard/microsoftedge/ and sign in with a Microsoft account.
2. Register as an Edge developer. The registration is free.
3. Fill in the publisher name and the contact email, and verify the email.

### 4. First upload by hand

The first upload to each store is manual. The stores create the extension id at that moment, and the automation needs that id.

For each store:

1. Download the zip for the store from the first GitHub Release.
2. Upload it in the store dashboard as a new item.
3. Fill in the listing: name, short description, a 128 px icon, at least one screenshot (1280 x 800 px), and the privacy policy link. The link is the `PRIVACY.md` file on GitHub.
4. Submit for review. Chrome takes from hours to days. Firefox takes from minutes to days. Edge takes up to seven business days.

Edge Add-ons has two more rules for the listing:

- The logo is 300 x 300 px. Use `docs/store-assets/edge-logo-300.png`.
- The description has at least 250 characters.

### 5. Chrome service account

The Chrome Web Store API v2 uses a Google Cloud service account. Follow the guide at https://developer.chrome.com/docs/webstore/service-accounts.

1. Open https://console.cloud.google.com and create a project.
2. Enable the "Chrome Web Store API" in the project.
3. Create a service account. It needs no roles.
4. Open the Chrome Web Store dashboard, go to Account, and add the email of the service account.
5. In the Cloud Console, open the service account, go to Keys, and create a JSON key.

### 6. Edge API credentials

The Edge Add-ons API v1.1 uses a client ID and an API key. Follow the guide at https://learn.microsoft.com/microsoft-edge/extensions/publish/api/using-addons-api.

1. In Partner Center, open Microsoft Edge, then "Publish API".
2. Select "Create API credentials".
3. Copy the client ID and the API key.
4. Open the overview page of the extension and copy the product ID.

### 7. Credentials for the automation

1. Run `npx wxt submit init`. Choose the Chrome Web Store, Firefox Add-ons, and Edge Add-ons. Choose the Chrome API version `v2`.
2. If it asks for the service account, copy the `client_email` and `private_key` fields from the JSON key.
3. If it asks for the Edge values, use the values from step 6.
4. The command writes the values to `.env.submit`. Git ignores this file. Do not commit it.
5. Add these ten values as repository secrets in GitHub, under Settings, Secrets and variables, Actions:
   - `CHROME_EXTENSION_ID`
   - `CHROME_PUBLISHER_ID`
   - `CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL`
   - `CHROME_SERVICE_ACCOUNT_PRIVATE_KEY`
   - `FIREFOX_EXTENSION_ID`
   - `FIREFOX_JWT_ISSUER`
   - `FIREFOX_JWT_SECRET`
   - `EDGE_PRODUCT_ID`
   - `EDGE_CLIENT_ID`
   - `EDGE_API_KEY`
6. Run `npm run zip`, then check the credentials with `npx wxt submit --dry-run` and the four zip flags. The command reads `.env.submit`.
7. Delete the JSON key file.

`.env.example` lists every variable that `npx wxt submit init` writes. It contains no secret values.

From the next tag, the release workflow uploads the zips by itself.

## Maintenance

### Renew the Edge API key

The Edge API key expires. Partner Center shows the expiry date on the "Publish API" page.

If the key expires, the Edge upload fails and the release workflow fails.

1. In Partner Center, open Microsoft Edge, then "Publish API".
2. Create a new API key.
3. In GitHub, replace the value of the `EDGE_API_KEY` secret.
4. Replace `EDGE_API_KEY` in your local `.env.submit`.

### Upload to one store by hand

One step uploads to all stores. If one store fails, the other stores can still receive the new version.

A second run of the workflow then fails, because those stores already have that version. So upload to the failed store by hand:

1. Fix the cause of the failure. Example: renew the Edge API key.
2. Download the zip for the failed store from the GitHub Release of the tag. Put it in `.output/`.
3. Run `npx wxt submit` with only the zip flag of that store. The command reads `.env.submit`.

Examples:

```sh
npx wxt submit --edge-zip .output/*-edge.zip
npx wxt submit --chrome-api-version v2 --chrome-zip .output/*-chrome.zip
npx wxt submit --firefox-zip .output/*-firefox.zip --firefox-sources-zip .output/*-sources.zip
```
