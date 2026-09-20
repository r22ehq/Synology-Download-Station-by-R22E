# Contributing to Synology Download Station by R22E

Thank you for your interest in contributing!

## Development Setup

1. Fork and clone the repository.
2. Install dependencies: `pnpm install`
3. Start the dev server: `pnpm dev`
4. Load the unpacked extension from `.output/chrome-mv3/`

## Pull Request Process

1. Create a branch from `main`.
2. Make your changes.
3. Ensure all checks pass:
   ```bash
   pnpm typecheck
   pnpm lint
   pnpm test
   pnpm build:all
   ```
4. Write clear commit messages.
5. Open a pull request with a description of your changes.

## Code Style

- TypeScript strict mode — no `any` types.
- Use `import type` for type-only imports.
- Comments explain **why**, not **what**.
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
