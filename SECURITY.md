# Security Policy — Synology Download Station by R22E

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public GitHub issue for security vulnerabilities.
2. Email your report to [security contact TBD] or use GitHub's private vulnerability reporting feature.
3. Include steps to reproduce the issue.
4. We will acknowledge receipt within 48 hours.

## Security Principles

This extension follows strict security practices:

### No Remote Code Execution
- No `eval()`, `new Function()`, or equivalent.
- No remote script loading.
- Strict Content Security Policy (CSP) enforced by Manifest V3.

### Credential Safety
- Passwords are never logged or included in error messages.
- Session IDs (SIDs) are never exposed to content scripts.
- Authentication tokens are never sent to any host other than the configured NAS.
- Session data uses `chrome.storage.session` (cleared on browser close) by default.

### Input Validation
- All NAS URLs are validated before use.
- All imported settings are validated against a schema.
- All API responses are validated before processing.
- Webpage content is treated as untrusted.

### Minimal Permissions
- No `<all_urls>` permission requested at install time.
- Host permissions are requested per-NAS only.
- Optional features require explicit permission grants.
- Content scripts are minimal and optional.

### Dependencies
- Dependencies are kept minimal and reviewed.
- No unnecessary runtime dependencies.
- Supply chain security via lockfile verification.

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest  | ✅        |
| < Latest | ❌      |

## Security Headers

The extension does not serve web content, but all API communication:
- Uses HTTPS when configured.
- Validates response formats.
- Implements request timeouts.
- Supports CSRF tokens (X-SYNO-TOKEN).
