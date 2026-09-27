# Security Policy

## Reporting a Vulnerability

Security vulnerabilities should **NOT** be reported through public issues. 

You may report vulnerabilities by:
- Emailing `hello@r22e.com`
- Using GitHub Private Vulnerability Reporting (if enabled on this repository)

When reporting, please include:
- Affected extension version
- Browser and version
- DSM version (where relevant)
- Reproduction steps
- Impact
- Proof of concept (if safe to provide)
- Sanitized diagnostics

**IMPORTANT**: DO NOT send us:
- Your NAS password
- Your SID
- Your OTP codes
- Browser cookies
- Device tokens
- Private tracker credentials

## Security Claims and Architecture

This extension is designed around strict, verifiable security practices:

### Network and Host Permissions
- **Minimal Permissions:** No mandatory `<all_urls>` permission. Host permissions are strictly constrained to the specific NAS origin you configure.
- **Private Trackers:** Accessing private trackers to retrieve torrent files requires explicit user initiation and optional origin permissions.

### Storage and Credential Safety
- **Opt-in Password Persistence:** By default the extension does not save your NAS password. If you select **Save password on this device**, it is stored in browser extension local storage to support automatic sign-in. This is not end-to-end encrypted by the extension; do not enable it on a shared browser profile or device.
- **Session State:** Active session IDs (SIDs) are stored in browser extension session storage. If **Remember this device** is enabled, a remembered session may also be stored locally.
- **Device Tokens:** If you opt into remembering your device for 2FA, the persistent Synology device token is stored in the browser extension's local storage.
- **Transport:** Prefer HTTPS for NAS connections. User-configured HTTP connections are supported for local compatibility but expose credentials and session data to interception on the network.
- **Log Sanitation:** Passwords and tokens are intentionally omitted from UI error states and development logs.

### Content Scripts & Remote Code
- **No Remote Code Execution:** The extension strictly forbids `eval()`, `new Function()`, and remote script loading.
- **Strict CSP:** A strict Content Security Policy (CSP) is enforced by Manifest V3.
- **No Global Content Scripts:** No global content script is injected into webpages. 

### Request Integrity

- **Validation:** All NAS URLs and imported settings schemas are strictly validated before processing.
