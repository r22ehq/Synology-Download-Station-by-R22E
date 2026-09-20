# Contributing

Thank you for your interest in contributing to Synology Download Station by R22E!

## Prerequisites
- Node.js >= 22.0.0
- pnpm >= 9.x.x

## Development Setup

1. Fork and clone the repository.
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Start the dev server for Chrome:
   ```bash
   pnpm dev
   ```
   (Alternatively, `pnpm dev:firefox` or `pnpm dev:edge`).
4. Load the unpacked extension from `.output/chrome-mv3/` (or your respective browser target) into your browser.

## Architecture & Codebase

The extension is built using the WXT framework, Preact, and TypeScript.
Key directories:
- `entrypoints/`: Contains UI surfaces like `popup`, `options`, `sidepanel`, and the `background` service worker. Note: There is no global content script injected into webpages.
- `src/core/`: Contains the Synology API client, storage adapters, and business logic.
- `src/ui/`: Contains reusable Preact components and state management.

## Quality Gates

Before opening a pull request, ensure all checks pass locally:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build:all
```

**Note on E2E Tests:** Real-NAS integration tests are strictly opt-in and require local environment variables (`R22E_TEST_NAS_URL`, etc.). You are not required to provide personal NAS credentials to run the normal CI suite. The mock E2E suite (`pnpm test:e2e`) provides comprehensive offline coverage.

## Pull Request Process

1. Create a feature branch from `main`.
2. Ensure your code passes all formatting, linting, and tests.
3. Update relevant documentation.
4. Keep the PR focused on a single logical change.
5. Provide a clear description and context in your PR.
- Prefer small, focused modules.
- Use CSS Modules for styling.
- Use design tokens from `src/ui/styles/tokens.css`.

## Architecture

- `src/core/synology/` — Synology API client (transport, auth, Download Station, File Station)
- `src/core/domain/` — Domain models and validation
- `src/core/platform/` — Browser abstractions (storage, messaging, permissions)
- `src/ui/` — UI components and styles
- `entrypoints/` — Extension entry points (popup, sidepanel, options, background, content)
- `tests/` — Unit and integration tests

## Reporting Issues

- Use GitHub Issues.
- Include browser version and extension version.
- Never include NAS credentials, IP addresses, or session tokens in reports.
