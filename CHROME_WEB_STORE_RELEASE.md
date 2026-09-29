# Chrome Web Store release sheet — 0.1.7

This sheet describes the Chrome build in `.output/synology-download-station-by-r22e-0.1.7-chrome.zip`. Update the **existing published item** (`fghcklhmghcmhfhhhcmjfenchgghmanp`); do not create a second listing. The ZIP has `manifest.json` at its root. These are copy-ready English answers based on this build, not a claim of Chrome Web Store approval.

## Before uploading

1. Run `pnpm check:release` before packaging or uploading. The local package version is `0.1.7`. The 0.1.5 draft was submitted for review on 29 September 2026; check the current dashboard and obtain authorization before replacing that submission. Version 0.1.7 has not yet been uploaded or submitted.
2. **Done:** Updated `PRIVACY.md` was published to the public repository on 27 September 2026 in commit `de41fa6`; its raw public contents were checked. The policy URL below is usable.
3. **Done:** Five 1280×800 current-UI screenshots from `output/edge-store-media/current-0.1.5-hq/store/` were uploaded in the same order to both Localized and Global assets. They show dark and light tasks, appearance colors, notification sounds, and location. They use synthetic tasks and a mock NAS, without personal host or account data.
4. **Done:** The branded small and marquee promotional tiles are `docs/media/store-small-promo-440x280.jpg` and `docs/media/store-marquee-promo-1400x560.jpg` at the exact Store dimensions.
5. **Done:** A test message to `hello@r22e.com` was received and confirmed by the publisher on 27 September 2026. A Support URL must still be a URL, not an email address.

## Store listing

| Field | Enter/select |
| --- | --- |
| Current editing language | English (default) |
| Title | `Synology Download Station by R22E` (from package) |
| Summary | `Manage Synology Download Station: add links, magnets and torrents, track progress, and control NAS downloads.` (from package, 109 characters) |
| Category | The closest **Productivity** / **Workflow & Planning** category offered by the current dropdown |
| Store icon | Use the packaged 128×128 icon (`public/icon-128.png`) if the dashboard does not retain the existing icon |
| Localized screenshots | Upload `01-tasks-dark.png`, `02-tasks-light.png`, `03-appearance-colors.png`, `04-notifications-sound.png`, `05-location.png` from `output/edge-store-media/current-0.1.5-hq/store/` in that order |
| Global screenshots | Upload the same five images in the same order; this avoids showing an older UI in languages without localized screenshots |
| Localized and global promo videos | Leave blank until a genuine YouTube product walkthrough exists; do not use the README GIF as a promo-video URL |
| Small promo tile | Upload `docs/media/store-small-promo-440x280.jpg` |
| Marquee promo tile | Upload `docs/media/store-marquee-promo-1400x560.jpg` (optional, but supplied) |
| Official URL | Select `r22e.com` if it is verified in your Chrome Web Store publisher account; the site is live and belongs to the publisher |
| Homepage URL | `https://r22e.com/plugins/r22e-station` — the working product page is a better user-facing homepage than the code repository |
| Support URL | `https://r22e.com/contact` — the working contact page links to the confirmed support email; GitHub Issues remains an alternative for bug reports |
| Mature content | Off |

**Description — paste into the Store listing Description field:**

Use `docs/chrome-store-description.txt`, preserving its paragraph breaks and feature headings. Its “WHAT'S NEW IN 0.1.7” section is the public update summary; `CHANGELOG.md` holds the full release history.

## Privacy

**Single purpose description:**

> Manage a user's Synology Download Station tasks from the browser and send user-selected links or torrent files to their configured NAS.

**Permission justifications — paste each in the matching box:**

| Permission | Justification |
| --- | --- |
| `storage` | Stores NAS profiles and preferences locally, including an opt-in saved password or remembered session. Session data and task snapshots support connection and task management. No R22E account or analytics backend is used. |
| `contextMenus` | Adds user-invoked right-click actions to send a selected link or media URL to Download Station and to collect candidate links from the current page. |
| `alarms` | Schedules background task checks while downloads require monitoring, so badge status and completion/failure alerts can update when the popup is closed. |
| `activeTab` | Grants temporary access to the current tab after a user action such as collecting page links or showing feedback for a right-click action. |
| `scripting` | Injects a one-time page-link extractor or small feedback toast only after the user invokes the relevant feature. It does not continuously run on every page. |
| `offscreen` | Plays a packaged, optional completion sound using an offscreen document because a Manifest V3 service worker cannot play audio directly. |
| `sidePanel` | Opens a persistent task-management panel while the user browses. |
| `notifications` (optional) | Displays optional local browser alerts for download completion, task failure, or expired NAS authentication. The user can turn these off. |
| Host permission | Requests access to the configured NAS origin for Download Station API requests. QuickConnect discovery requires Synology's service; a user-selected torrent source may need its own origin permission. Access is requested at runtime rather than granted to all sites by default. |

**Remote code:** Select **“No, I am not using remote code.”** Executable JavaScript is packaged in the ZIP. NAS API responses, fetched torrent bytes, and QuickConnect discovery data are not remotely hosted executable code. Re-check this answer if implementation changes.

**Data usage checkboxes:** Select **Personally identifiable information** (NAS username), **Authentication information** (password, session ID, device token), and **Website content** (user-selected URLs, page links, torrent content). Do not select health, financial/payment, personal communications, location, web history, or user activity *for this build*. Local-only handling still counts for these disclosures. If future code handles a new category, update the form and policy before release.

**Three data-use certifications:** Check all three only after confirming they remain true for the uploaded package: no sale/unrelated transfer, no unrelated uses, and no credit/lending use. The present code has no R22E telemetry/backend or advertising data flow, but the publisher is responsible for these certifications.

**Privacy policy URL:** `https://github.com/r22ehq/Synology-Download-Station-by-R22E/blob/main/PRIVACY.md`. This extension-specific policy is now published. Do **not** use `https://r22e.com/privacy` for this extension: it is a general studio/product policy and currently does not describe the extension's optional saved password, NAS sessions, selected-site access, or QuickConnect behavior. A dedicated extension policy page on your own site could replace the GitHub URL later, but is not required for this release.

## Distribution

| Field | Enter/select |
| --- | --- |
| Payments | Free of charge, if the extension itself has no purchase flow |
| Visibility | Public for the intended public release; choose Private first if you want a limited reviewer/tester rollout. Unlisted means anyone with the link can access the listing. |
| Regions | All regions only if you intend worldwide distribution and can support it |

The 0.1.5 Chrome draft was submitted for review on 29 September 2026 with automatic publication after approval. Do not submit a different package or change the listing while that review is pending without rechecking its contents.

## Test instructions for reviewers

Use this text in **Access → Test instructions**, adjusting it to match any reviewer NAS you actually provide:

> This extension is a client for a user-owned Synology NAS running Download Station. To test with your own NAS, install Download Station, open the extension, choose Settings → Connection → Add NAS, enter the NAS URL and a test account, and sign in. Open the popup to view tasks. Paste a safe HTTP(S) file URL or magnet link in Add to create a task; then verify pause/resume/remove and task status. Right-click a downloadable link to test the context-menu action. Browser notifications can be enabled in Settings. QuickConnect-ID support is experimental, direct-connection only, and is not required to review the core local-NAS flow. No external R22E account is required.

If the review form requests credentials or the reviewer cannot test without a NAS, provide a **separate, temporary, least-privilege review NAS/account** through the dashboard's private reviewer instructions. Do not put your personal NAS password, session token, or private host details in the public listing. If you cannot provide a reachable reviewer environment, say so explicitly; review may be delayed or rejected.

## Release caveats to verify

- Saved passwords are optional but currently kept in extension-local browser storage **without extension-level encryption**. The privacy policy discloses this; do not describe passwords as never stored or encrypted at rest.
- The extension supports user-configured HTTP NAS connections for local networks. HTTP does **not** protect credentials or task data in transit. HTTPS is strongly recommended. Chrome's user-data handling policy may scrutinize this behavior; acceptance cannot be guaranteed.
- This extension is independent of Synology. QuickConnect support is unofficial and may break, and relay is not supported.
- Changing permissions, behavior, data handling, or description after preparing this sheet requires a fresh audit and new build/version.

## Official references

- Manifest description length: https://developer.chrome.com/docs/extensions/reference/manifest
- Listing fields and screenshot guidance: https://developer.chrome.com/docs/webstore/cws-dashboard-listing
- Privacy fields: https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
- Data usage, including local-only data: https://developer.chrome.com/docs/webstore/program-policies/user-data-faq
- Handling requirements: https://developer.chrome.com/docs/webstore/program-policies/data-handling
- Distribution: https://developer.chrome.com/docs/webstore/cws-dashboard-distribution
