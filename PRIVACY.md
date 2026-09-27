# Privacy Policy — Synology Download Station by R22E

Last updated: 27 September 2026

R22E Studio does not run an account service, analytics service, or telemetry backend for this extension. The extension is a browser client for a Synology NAS that you configure. It does not send your NAS credentials, task list, or browsing data to R22E Studio. This policy describes data handled on your device and data sent to services you choose to use.

## Data handled

- **NAS connection and authentication:** NAS address, protocol, port, profile name, username, and any QuickConnect ID are kept in extension-local browser storage. Your password is sent to the configured NAS when you sign in. If you opt in to **Save password on this device**, the password is also saved in extension-local browser storage for automatic sign-in. This storage is not end-to-end encrypted by the extension; anyone with access to your browser profile or device may be able to retrieve it. Turning off the option, removing the profile, or uninstalling the extension removes the extension's saved copy. Do not enable it on a shared device.
- **Session and remembered device:** A session ID and any Synology-issued device token are used to keep you signed in. Active session data is kept in browser session storage; if you choose **Remember this device**, a remembered session and device token may be kept in extension-local storage. The NAS can expire or revoke a session or token.
- **Downloads and preferences:** Download task names, URLs, destinations, status, speeds, selected page links, scraped link results, settings, and notification state are processed to show and control downloads. Settings, profiles, and recent destinations are kept locally; task snapshots and scraped results are kept in browser session storage. The optional settings export includes preferences and NAS profile metadata, including addresses and usernames, but excludes passwords, session IDs, device tokens, and downloaded files.
- **Browser pages:** The right-click Download action uses only the link, media URL, or selected URL you choose. The separate Scrape page action reads candidate links from the current page only when you invoke it. The extension does not continuously scan browsing history or pages.
- **Private trackers:** If you explicitly add a torrent from a private tracker, the extension may fetch that torrent from the selected site with your existing browser cookies after requesting origin access. Cookies stay with the browser's request to that site; they are not sent to R22E Studio or to your NAS. The fetched torrent file may be sent to your configured NAS to create the task.

## Network destinations

The extension communicates with the NAS address you configure and, for the experimental QuickConnect option, Synology's QuickConnect discovery service. User-initiated link or torrent actions may contact the selected source website. R22E Studio does not receive those requests. The extension does not sell user data or use it for advertising, profiling, or credit decisions.

Use **HTTPS** for your NAS whenever possible. The extension also allows a user-specified HTTP NAS address for local-network compatibility; HTTP does not encrypt the password, session, or download information in transit. Avoid HTTP on untrusted networks. A direct QuickConnect connection may change or fail; relay access is not supported.

## Permissions and control

The extension requests browser storage, context menus, alarms, active-tab access, scripting, and (on Chromium) an offscreen document and side panel for its described features. NAS and selected source-site access is requested for specific origins when needed. Browser notifications are optional. You can disable context-menu actions, background updates, notification sounds, and saved-password/remembered-device choices in the extension. Removing a NAS profile clears its saved credentials and session data from extension storage. Uninstalling the extension removes its local extension data. Data already sent to or downloaded by your NAS is controlled on the NAS and is not deleted by uninstalling the extension.

## Sharing and retention

R22E Studio does not receive or share your extension data. Data is sent only to the configured NAS, Synology's QuickConnect discovery service when selected, or a user-selected source website as described above. Local data remains until you remove the profile, change the relevant setting, clear extension data, or uninstall the extension. Session storage is cleared by the browser according to its session-storage lifecycle; a remembered session can persist longer when enabled.

## Limited use

The extension uses data from browser APIs only to provide the user-facing Synology Download Station features described here. It does not transfer that data to third parties except as necessary to perform a user-initiated action, does not use it for advertising, and does not allow people to read it except as needed for security or legal compliance.

## Contact

For privacy questions, contact `hello@r22e.com`.
