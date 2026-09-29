# Firefox reviewer build instructions

This source archive builds Synology Download Station by R22E version 0.1.7 for Firefox. It contains the original TypeScript, Preact, CSS, and static assets used to produce the extension ZIP.

Requirements: Node.js 22 or newer and pnpm 9.15.4 (via Corepack). The build uses open-source dependencies from the public npm registry. No credentials, environment file, network service, or NAS is needed. Do not set `R22E_E2E`; that variable is reserved for local automated testing and changes the manifest.

On Windows, macOS, or Linux, from the directory containing this file:

```sh
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm exec wxt build -b firefox
```

The unpacked extension is written to `.output/firefox-mv3/`. Compare its files with the submitted Firefox extension ZIP. The ZIP root contains `manifest.json`, not a parent directory.
