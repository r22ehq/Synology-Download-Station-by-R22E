# Release process

## Preview builds on every push

The CI workflow tests each push to `main`, builds Chrome, Edge, Firefox, and Opera targets, and uploads installable ZIPs as short-lived GitHub Actions artifacts. These are previews, not published releases or Store updates.

## Versioned GitHub releases

1. Finish code review and run `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:e2e`, and `pnpm build:all`.
2. Increase `version` in `package.json`; update release notes and audit Store privacy/permission disclosures if behavior or data handling changed.
3. Merge to `main`, then create and push a matching tag, such as `v0.1.2` for package version `0.1.2`.
4. The `Release` workflow verifies the tag/version match, repeats quality gates, creates all four browser ZIPs and SHA-256 checksums, then creates the GitHub Release.

Do not tag every commit. A release tag signals a reviewed, versioned package; Chrome Web Store rejects uploads without a higher manifest version and reviews each new package.

## Optional Chrome Web Store automation

The Store job is deliberately off until the existing item has been completed and published manually at least once. Chrome's API does not replace the initial Dashboard listing/privacy setup and cannot update a changed visibility setting before that setting is manually published.

After the first publication:

1. Enable the Chrome Web Store API in a Google Cloud project. Create a service account and add its email under the Chrome Web Store Publisher account. Configure GitHub OIDC Workload Identity Federation for this repository and service account (no JSON key in GitHub).
2. In GitHub repository variables, set `CWS_PUBLISHER_ID`, `CWS_EXTENSION_ID`, `CWS_WORKLOAD_IDENTITY_PROVIDER`, and `CWS_SERVICE_ACCOUNT`.
3. Create the GitHub environment `chrome-web-store`; restrict it to release tags and optionally require a reviewer. Set `CWS_AUTOPUBLISH_ENABLED` to `true` only when ready.
4. On the next `v*` tag, the job uses the exact Chrome ZIP from that tag, uploads it through the Chrome Web Store API v2, waits for processing, and submits it for review. `blockOnWarnings` is enabled. Approval and final publication still depend on Chrome's review.

The Store job fails safely if credentials, version, upload, or validation fail; the already-created GitHub Release remains available. Do not put NAS credentials, Store OAuth tokens, or service-account JSON keys in the repository.

Official references: [Chrome Web Store API](https://developer.chrome.com/docs/webstore/using-api), [service accounts](https://developer.chrome.com/docs/webstore/service-accounts), [GitHub deployment environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments).
