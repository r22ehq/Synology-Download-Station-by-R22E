# Synology Download Station by R22E

A fast, lightweight, and open-source browser client for Synology Download Station. Manage downloads, magnet links, torrents, and URLs directly from your browser.

## Features

- **Direct NAS Control:** Connect directly to your Synology NAS over your local network or custom domain.
- **Download Management:** Create, pause, resume, and delete download tasks.
- **Protocol Support:** Add magnet links, torrent files, and HTTP/HTTPS/FTP URLs.
- **Private Tracker Support:** Direct retrieval of torrent files from authenticated private trackers using your browser session.
- **Destination Browser:** Browse NAS folders and select download destinations.
- **Live Monitoring:** Real-time download/upload speeds and progress.
- **Notifications:** Get notified when downloads complete or fail.
- **Context Menus:** Right-click any link to download with your NAS.
- **Side Panel:** Persistent download view while browsing (Chrome, Edge).
- **Themes:** Light, dark, and system-following themes.

## Browser Support

| Browser | Status |
|---------|--------|
| Google Chrome | Tested |
| Microsoft Edge | Verified via Chromium build |
| Mozilla Firefox | Pending manual execution |
| Opera | Verified via Chromium build |
| Arc | Verified via Chromium build |
| Safari | Planned |

## Installation

### From Source

```bash
git clone https://github.com/r22ehq/Synology-Download-Station-by-R22E.git
cd Synology-Download-Station-by-R22E

# Install dependencies
pnpm install

# Production build
pnpm build:chrome
pnpm build:firefox
pnpm build:edge
pnpm build:opera
```

Load the unpacked extension from `.output/chrome-mv3/` (or equivalent browser directory) into your browser's extension developer mode.

## Connecting to Synology NAS

To connect the extension to your NAS, provide your NAS URL, port, protocol (HTTP/HTTPS), and your credentials in the extension's Settings page. If your NAS uses 2-Factor Authentication, the extension will prompt you for an OTP.

## Permissions

The extension strictly requests only the permissions necessary for core features. Host permissions are scoped exactly to the NAS URL you configure, rather than requesting global `<all_urls>` access upfront.

## Privacy

The extension communicates directly with your configured Synology NAS and, when explicitly requested, authenticated private trackers. There is no cloud backend, analytics, tracking, or telemetry. See [PRIVACY.md](PRIVACY.md).

## Security

Session IDs are securely handled in session storage, and persistent device trust tokens are safely kept in local storage. The extension implements strict Content Security Policies and avoids all remote code execution. See [SECURITY.md](SECURITY.md).

## Development and Testing

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed development guidelines.

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
```

## Disclaimer

Synology Download Station by R22E is an independent open-source project and is not affiliated with or endorsed by Synology Inc. Synology and Download Station are trademarks of their respective owners.

## License

[MIT](LICENSE)
