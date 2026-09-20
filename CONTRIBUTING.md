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

The extension is built using the WXT framework, Preact, and TypeScript. Note that there is no global webpage content script injected into webpages.

Key directories:
- `entrypoints/`: Extension entry points (popup, sidepanel, options, background)
- `src/core/synology/`: Synology API client (transport, auth, Download Station, File Station)
- `src/core/domain/`: Domain models and validation
- `src/core/platform/`: Browser abstractions (storage, messaging, permissions)
- `src/ui/`: UI components (using Preact and CSS Modules for styling), design tokens (`tokens.css`), and state management
- `tests/`: Unit and integration tests

## Quality Gates

Before opening a pull request, ensure all checks pass locally:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build:all
```

**Note on E2E Tests:** Real-NAS integration tests are strictly opt-in and require local environment variables (`R22E_TEST_NAS_URL`, `R22E_TEST_USERNAME`, `R22E_TEST_PASSWORD`, `R22E_TEST_DESTINATION`). You are not required to provide personal NAS credentials to run the normal CI suite. The mock E2E suite (`pnpm test:e2e`) provides comprehensive offline coverage.

### Real NAS Test Account Requirements
If you intend to run real NAS integration tests (`pnpm test:nas:preflight` and `pnpm test:nas`), you **MUST** use a dedicated test account. Do not use your primary administrator account.

Recommended account name: `r22e_test`
- **Permissions**: Grant access to Download Station and only the specific File Station shared folder containing your `R22E_TEST_DESTINATION`.
- **Role**: Standard user (no Administrator privileges).
- **Security**: The automated test harness bypasses the extension's UI for teardown and cleanup using a direct Node.js HTTP client. Therefore, this dedicated test account must **NOT** have mandatory 2FA (OTP) enabled. (The extension's 2FA capabilities are validated separately).
- **Destination**: The test destination path must be exact and exist on the NAS. Never use your main download folder for destructive testing.

## Pull Request Process

1. Create a feature branch from `main`.
2. Ensure your code passes all formatting, linting, and tests.
3. Update relevant documentation.
4. Keep the PR focused on a single logical change.
5. Provide a clear description and context in your PR.

## Reporting Issues

- Use GitHub Issues.
- Include browser version and extension version.
- Never include NAS credentials, IP addresses, or session tokens in reports.
