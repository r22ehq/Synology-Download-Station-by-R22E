# R22E Station

**Synology Download Station by R22E** — manage downloads on your own NAS without leaving the browser.

![R22E Station demo: downloading, completed, and paused tasks](docs/media/r22e-station-demo.gif)

[Product page](https://r22e.com/plugins/r22e-station) · [GitHub releases](https://github.com/r22ehq/Synology-Download-Station-by-R22E/releases) · [Privacy policy](PRIVACY.md) · [Report a bug](https://github.com/r22ehq/Synology-Download-Station-by-R22E/issues/new)

[![Install from Chrome Web Store](https://img.shields.io/badge/Install_from-Chrome_Web_Store-FBBC05?style=for-the-badge&logo=googlechrome&logoColor=black)](https://chromewebstore.google.com/detail/synology-download-station/fghcklhmghcmhfhhhcmjfenchgghmanp)
[![Install from Microsoft Edge Add-ons](https://img.shields.io/badge/Install_from-Microsoft_Edge_Add--ons-0078D7?style=for-the-badge&logo=microsoftedge&logoColor=white)](https://microsoftedge.microsoft.com/addons/detail/dlaehmkhjnclaljfhkleblhdjgcjloom)
[![Install for Firefox and Zen](https://img.shields.io/badge/Install_for-Firefox_%26_Zen-FF7139?style=for-the-badge&logo=firefoxbrowser&logoColor=white)](https://addons.mozilla.org/en-US/firefox/addon/r22e-station/)

Chrome, Edge, and Firefox are available in their browser stores. Zen uses the Firefox Add-ons listing. Opera's store listing is still pending; its package is available on GitHub Releases. Safari is not available.

## What it does

- Add HTTP(S), FTP, magnet links, and torrent files to Synology Download Station.
- Pause, resume, remove, search, and inspect tasks; open a completed task's destination in File Station.
- Send a selected link from the right-click menu, or collect candidate links from the current page on demand.
- Keep a side panel open while browsing, with responsive controls down to narrow widths.
- Choose light, dark, or system appearance and optional completion notifications.
- Set a destination folder per NAS or follow the Download Station default.
- Manage upload and download speed limits and preview completion sounds.
- Connect directly to a local NAS or custom address. Experimental QuickConnect-ID discovery supports direct routes only, not relay.

The extension requires your own compatible Synology NAS, Download Station, and a user account. It has no R22E cloud account, analytics, or telemetry service.

## Interface

These are captures of the actual extension using a local mock NAS and synthetic filenames. No private NAS address, account, or tracker data appears in the images.

| Light | Dark |
| --- | --- |
| ![Light task view](docs/media/tasks-light-1280x800.jpg) | ![Dark task view](docs/media/tasks-dark-1280x800.jpg) |

![Appearance controls in dark mode](docs/media/appearance-dark-1280x800.jpg)

The [compact side-panel view](docs/media/tasks-compact-880x1520.jpg) keeps progress, status, and per-task actions visible.

## Browser support

| Browser | Availability and testing | Install / package |
| --- | --- | --- |
| Google Chrome | Store listing available; automated UI checks passed in Chromium | [Chrome Web Store](https://chromewebstore.google.com/detail/synology-download-station/fghcklhmghcmhfhhhcmjfenchgghmanp) · [Chrome ZIP](https://github.com/r22ehq/Synology-Download-Station-by-R22E/releases/latest) |
| Microsoft Edge | Store listing available; connection-flow checks passed in Edge | [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/dlaehmkhjnclaljfhkleblhdjgcjloom) · [Edge ZIP](https://github.com/r22ehq/Synology-Download-Station-by-R22E/releases/latest) |
| Mozilla Firefox | Store listing available; latest session fix needs native verification | [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/r22e-station/) · [Firefox ZIP](https://github.com/r22ehq/Synology-Download-Station-by-R22E/releases/latest) |
| Zen | Uses the Firefox listing; native Zen QA pending | [Firefox Add-ons for Zen](https://addons.mozilla.org/en-US/firefox/addon/r22e-station/) |
| Opera | Store review pending; latest session fix needs native verification | [Opera ZIP](https://github.com/r22ehq/Synology-Download-Station-by-R22E/releases/latest) |
| Arc | Chromium compatibility expected; manual QA pending | [Chrome builds](https://github.com/r22ehq/Synology-Download-Station-by-R22E/releases) |
| Safari | Not available | — |

ZIP links open GitHub Releases: choose the asset named for your browser. For source builds and unpacked installation, see [Contributing](CONTRIBUTING.md).

Store approval does not mean every browser-specific feature has been independently tested. Store versions and GitHub releases may differ; check the listing or release version before installing.

## Getting connected

Open **Settings → Connection → Add NAS**. The local connection is recommended: enter your NAS address and an account with Download Station access. HTTPS is strongly recommended, particularly outside a trusted local network. HTTP does not protect your password or task data in transit. Two-factor authentication is supported when your NAS requests a code.

QuickConnect-ID is an **unofficial experimental** option. It may break when Synology changes its service, and it cannot use QuickConnect relay. A directly reachable local address, DDNS name, or your own remote URL is more reliable.

## Privacy and security

The extension requests NAS host access when you configure a connection and requests source-site access when a selected action needs it; it does not request blanket access to every website by default. Optional saved passwords are kept in extension-local browser storage **without extension-level encryption**. Review the [privacy policy](PRIVACY.md) and [security guidance](SECURITY.md) before using this on an untrusted device.

This independent project is not affiliated with or endorsed by Synology Inc. Synology and Download Station are trademarks of their respective owners.

## Contributing

Build instructions, development setup, test commands, and real-NAS test safety rules live in [CONTRIBUTING.md](CONTRIBUTING.md). Maintainers can follow the [release process](RELEASING.md). Issues and pull requests are welcome.

Licensed under [MIT](LICENSE).
