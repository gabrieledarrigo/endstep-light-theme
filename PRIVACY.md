# Privacy Policy — Endstep Light Theme

**Last updated: 17 November 2026**

## Overview

Endstep Light Theme ("the Extension") is a browser extension that allows users to apply a light accessible theme to [endstep.cc](https://endstep.cc/) user interfaces.

## Data Collection

Endstep Light Theme **does not collect** or **transmit** any personal data. It stores only the user preference for the theme. Specifically, the Extension does **not** collect:

- Personally identifiable information
- Browsing history or URLs
- Page content
- Analytics or usage telemetry
- Authentication credentials

The Extension source code contains no `fetch`, `XMLHttpRequest`, `WebSocket`, and makes no network requests.

## Permissions

The Extension requests one permission and **one host permission**:

| Permission             | Use                                                              |
| ---------------------- | ---------------------------------------------------------------- |
| `storage`              | Stores the theme choice, so it persists across browser sessions. |
| `https://endstep.cc/*` | The host on which the Extension applies the light theme.         |

The Extension works only on https://endstep.cc/ and does not interact with any other websites.

## Data Storage

The Extension stores one value, theme (`"light"` or `"dark"`), in the browser's local extension storage. The value stays on the user's device, and is not transmitted to any server; the value is deleted when the user uninstalls the Extension.

## Third-Party Services

None. The Extension uses no third-party services, no analytics SDKs, no error-reporting services, and no remote configuration.

## Changes to This Policy

Any changes to this policy will be reflected by updating the "Last updated" date above.

## Contact

For questions about this policy, open an issue on the [GitHub issue page](https://github.com/gabrieledarrigo/endstep-light-theme/issues), or contact the author at [darrigo.g@gmail.com](mailto:darrigo.g@gmail.com).
