# Privacy Policy

R22E Studio does not operate a backend for this extension and does not receive analytics, telemetry, browsing data, NAS credentials, tracker credentials, or download activity.

## Network Communication

**Synology NAS:**
Normal Download Station communication goes directly between the browser extension and your configured Synology NAS origins. 

**Private Trackers:** 
When you explicitly invoke authenticated private-tracker retrieval, the extension may fetch the selected `.torrent` URL directly from that tracker origin using your browser's authenticated session (cookies) where permitted.
- Tracker access is entirely user-initiated.
- Origin permission is explicitly requested.
- Tracker credentials and cookies are **not** sent to R22E Studio.
- Tracker cookies are **not** forwarded to your Synology NAS.
- Downloaded torrent bytes may then be uploaded to your configured NAS for processing.
- HTML/login/challenge responses are rejected when recognized.

## Data Storage

The extension stores the following data locally in your browser:

| Data | Storage Location | Purpose |
|------|-----------------|---------|
| NAS profiles (host, port, protocol) | browser extension local storage | Connecting to your NAS |
| NAS username | browser extension local storage | Authentication |
| Settings and recent destinations | browser extension local storage | User preferences |
| Remembered-device token | browser extension local storage | 2FA device trust |
| Session ID (SID) | browser extension session storage | Maintaining authenticated session |
| Cached task state | browser extension session storage | Performance |
| Notification state | browser extension session storage | Deduplication |

### Passwords

Passwords are used only during the login request to your NAS. Passwords are **never persistently stored**. The extension implements a "Remember Device" feature for 2FA, which stores a Synology-issued device token in your browser extension local storage, rather than retaining passwords.

## Contact

For privacy questions, please email `hello@r22e.com`.
