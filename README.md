# Synology Download Station by R22E

A fast, lightweight and open-source browser client for Synology Download Station. Manage downloads, magnet links, torrents and URLs directly from Chrome, Firefox, Edge, Opera, Arc and Safari.

## Features

- 🔗 **Direct NAS Control** — Connect directly to your Synology NAS over your local network or custom domain
- ⬇️ **Download Management** — Create, pause, resume and delete download tasks
- 🧲 **Magnet & Torrent Support** — Add magnet links, torrent files, HTTP/HTTPS/FTP URLs
- 📂 **Destination Browser** — Browse NAS folders and select download destinations
- 📊 **Live Monitoring** — Real-time download/upload speeds and progress
- 🔔 **Notifications** — Get notified when downloads complete or fail
- 🖱️ **Context Menus** — Right-click any link to download with your NAS
- 📌 **Side Panel** — Persistent download view while browsing (Chrome, Edge)
- 🌙 **Dark Mode** — Light, dark and system-following themes
- 🔒 **Privacy First** — No analytics, no tracking, no cloud backend
- 🔑 **Secure** — Credentials never stored by default, strict CSP, minimal permissions
- 🌐 **Multi-NAS** — Support for multiple Synology NAS profiles
- ♿ **Accessible** — Keyboard navigation, focus management, ARIA labels

## Browser Support

| Browser | Status |
|---------|--------|
| Google Chrome | ✅ Supported |
| Microsoft Edge | ✅ Supported |
| Mozilla Firefox | ✅ Supported |
| Opera | ✅ Supported |
| Arc | ✅ Supported (uses Chrome build) |
| Safari | 🔄 Planned |

## Installation

### From Store (Coming Soon)
- Chrome Web Store
- Firefox Add-ons (AMO)
- Edge Add-ons
- Opera Add-ons

### From Source

```bash
# Clone the repository
git clone https://github.com/YOUR-ORG/synology-download-station-by-r22e.git
cd synology-download-station-by-r22e

# Install dependencies
pnpm install

# Development (Chrome)
pnpm dev

# Development (Firefox)
pnpm dev:firefox

# Production build
pnpm build:chrome
pnpm build:firefox
pnpm build:edge
pnpm build:opera
```

Load the unpacked extension from `.output/chrome-mv3/` (or equivalent browser directory).

## Development

### Prerequisites

- Node.js >= 18
- pnpm >= 8

### Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server (Chrome) |
| `pnpm dev:firefox` | Start dev server (Firefox) |
| `pnpm build:all` | Build for all browsers |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run unit tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm zip:all` | Create release ZIPs for all browsers |

### Tech Stack

- **TypeScript** — Strict mode, no `any`
- **WXT** — Modern browser extension framework
- **Preact** — Lightweight UI (3KB)
- **Preact Signals** — Reactive state management
- **CSS Modules** — Scoped, zero-runtime styling
- **Vite** — Fast builds via WXT
- **Vitest** — Unit testing
- **Native Fetch** — No HTTP client dependencies

## Privacy

This extension communicates only with your configured Synology NAS. No data is sent to any third-party server. No analytics, tracking, or telemetry. See [PRIVACY.md](PRIVACY.md).

## Security

Credentials are handled securely with strict least-privilege permissions. See [SECURITY.md](SECURITY.md).

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)
