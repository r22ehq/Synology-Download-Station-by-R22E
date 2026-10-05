# R22E Station user guide

R22E Station is a browser client for an existing Synology Download Station installation. Your NAS performs the downloads; the extension sends requests and displays the NAS response. You need a reachable NAS address, Download Station installed, and a NAS account permitted to use it.

## Connect a NAS

Open **Settings → Connection → Add NAS**. Choose **Local HTTP**, **Local HTTPS**, or the experimental **QuickConnect** option, then enter the NAS address. The local address can include its protocol and port; HTTP normally uses port 5000 and HTTPS normally uses port 5001. Grant browser access to that address before entering credentials. The connection test reports whether the NAS can be reached and whether the account can sign in. An incorrect address, unavailable NAS, invalid credentials, or missing permissions produce different error guidance.

HTTP does **not** encrypt credentials or task data in transit; use it only on a trusted local network. HTTPS requires a hostname and certificate trusted by the browser. QuickConnect-ID discovery only supports direct routes, not Synology relay, and may stop working if Synology changes its service. The extension does not silently change your selected protocol.

Enter the NAS username and password, then **Save and connect**. If the NAS requires two-step verification, enter the requested code. **Remember this device** keeps the NAS session and device token in this browser. **Save password on this device** is optional; the password stays in extension-local browser storage without extension-level encryption. Do not enable it on a shared device.

The popup header shows the active NAS, connection state, and current transfer rates. Connection settings let you switch or remove NAS profiles. Removing a profile clears its saved credentials and sessions, not the downloads already running on the NAS.

## Add a download

Paste a URL or magnet link into the popup and select **Add**, or open **Add download** for more options:

| Input | What the extension accepts |
| --- | --- |
| **URL** | One or more download URLs, one per line. |
| **Magnet** | Magnet links only, one per line. |
| **Task file** | A supported torrent/task file selected from your device. |
| **Destination** | Optional NAS folder. Leave it unchanged to use the profile preference or Download Station default. |

The destination chooser is collapsed initially; expand it to browse NAS folders. On success, Download Station creates a task and it appears in the task list. On failure, the extension shows the error instead of claiming the task was added. A right-click action can also send a selected link; page-link collection requests access to the selected site only when needed.

## Read and control tasks

The popup lists task name, progress, transfer speed, size, and status. Use **All**, **Active**, **Inactive**, **Completed**, or **Downloading** to filter the list, and Search to narrow it by name. Select one or more tasks to pause, resume, or delete them. Expand a task for its type, destination, owner, and transfer details. Completed tasks can open their destination in File Station when your NAS account has access.

The extension displays Download Station's reported status. A stalled or failed download may be caused by an unavailable source, NAS network issue, or NAS folder permission; check the task in Download Station on the NAS first. Closing the browser does not stop a task that the NAS has accepted.

## Preferences and troubleshooting

- **Settings → Location:** follow the NAS Download Station default or choose a folder for new downloads from this extension. Existing tasks and the NAS-wide default are not changed.
- **Settings → Speed:** view and set NAS Download Station upload/download limits in KB/s; `0` means unlimited.
- **Settings → Refresh:** adjust how often task data updates.
- **Settings → Browser:** configure browser actions such as the right-click download option and toolbar badge.
- **Settings → Appearance, Notifications, Data:** change the visual theme, alerts, and local data preferences.

For a connection problem, verify the exact address and port, browser host permission, protocol/certificate, NAS reachability, account credentials, and Download Station privileges. For a product bug, [open a GitHub issue](https://github.com/r22ehq/Synology-Download-Station-by-R22E/issues/new) with the browser and extension version and a short reproduction. Do not include NAS passwords, session tokens, private links, or private IP addresses. Report security vulnerabilities privately using [SECURITY.md](../SECURITY.md).
