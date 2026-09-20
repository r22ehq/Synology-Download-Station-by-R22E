# Privacy Policy — Synology Download Station by R22E

## Overview

Synology Download Station by R22E is a browser extension that communicates directly with your Synology NAS. It does not use any cloud backend, proxy, or intermediary server.

## Data Collection

This extension **does not** collect, transmit, or store any data outside of your browser and your configured Synology NAS.

Specifically:

- **No analytics** are collected.
- **No tracking pixels** are included.
- **No browsing history** is accessed or stored.
- **No advertising SDKs** are included.
- **No telemetry** is sent to any third-party service.
- **No data is sent to us** or any server other than your configured NAS.

## Data Storage

The extension stores the following data locally in your browser's extension storage:

| Data | Storage Location | Purpose |
|------|-----------------|---------|
| NAS connection details (host, port, protocol) | `chrome.storage.local` | Connecting to your NAS |
| NAS username | `chrome.storage.local` | Authentication |
| Session ID (SID) | `chrome.storage.session` | Maintaining authenticated session |
| Extension settings (theme, polling, badges) | `chrome.storage.local` | User preferences |
| Recent download destinations | `chrome.storage.local` | Convenience |
| Cached task list | `chrome.storage.session` | Performance |

### Passwords

- Passwords are used only during the login request to your NAS.
- Passwords are **never** stored persistently by default.
- If you enable "Remember credentials" (opt-in), credentials are stored in `chrome.storage.local`.
- Extension local storage is **not** an encrypted credential vault. We do not claim otherwise.

## Network Communication

All network requests are sent **exclusively** to your configured Synology NAS address. The extension:

- Communicates only with the host(s) you configure.
- Uses the Synology DSM Web API over HTTP or HTTPS.
- Requests browser permissions only for the specific NAS origin you configure.
- Does not contact any other server.

## Permissions

The extension requests only the minimum permissions needed:

- **storage**: Store settings and session data locally.
- **contextMenus**: Add right-click download options.
- **alarms**: Schedule background polling.

Optional permissions (requested only when needed):

- **Host permission for your NAS URL**: Required to communicate with your NAS.
- **notifications**: Show download completion alerts.
- **downloads**: Optionally intercept browser downloads.
- **clipboardRead**: Optionally paste URLs from clipboard.

## Open Source

This extension is open source. You can inspect the complete source code at any time.

## Contact

For privacy questions, open an issue on the GitHub repository.
