# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.7] - 2026-09-29

### Fixed
- Prevented a delayed session-storage read from overwriting a successful login or restoring a session after logout.
- Added deterministic session-race regression tests and verified the Test connection → Save and connect flow in Chromium and Edge.

## [0.1.6] - 2026-09-29

### Changed
- Standardized checkbox and radio styling across browser builds while preserving keyboard interaction and system high-contrast controls.
- Synchronized Chrome, Edge, Firefox, and Opera packages at version 0.1.6.

## [0.1.5] - 2026-09-29

### Added
- Per-NAS Location preferences, with the Download Station default or a custom destination folder.
- Speed settings for Download Station limits, with permission checks for non-manager accounts.
- Six completion sounds with an in-app preview.

### Changed
- Kept connection setup inside the extension with distinct Local HTTP, Local HTTPS, and QuickConnect choices.
- Requested NAS access before credential entry, retaining only the address step if a permission prompt closes the popup.
- Selected Local HTTP by default for new connections, with an explicit unencrypted-network notice.
- Made the Add dialog destination selector collapsed by default, with an expandable folder browser.
- Restored the 580 × 520 popup layout and the single-row task filters.
- Improved cross-context request handling for Location and Speed settings.
- Kept Firefox's local test folder synchronized with the current production build.
- Prevented Firefox's default CSP from silently upgrading selected local HTTP connections to HTTPS.
- Added release checks to exclude private workspace files and test-only permissions from browser packages.

## [0.1.4] - 2026-09-28

### Changed
- Replaced whole-view movement with a short fade when navigating to and from Settings.
- Added a lightweight Add dialog entrance and smooth task-details expansion.
- Restored the colored hover sweep on task actions without moving the buttons.
- Softened the selected task-filter outline and organized task details into compact, readable columns.
- Displayed action feedback as a floating notice so the task table stays in place.

## [0.1.3] - 2026-09-28

### Changed
- Compact URL and Add controls, with an inline search close button and keyboard focus restoration.
- Subtle input focus rings and short, reduced-motion-aware Settings transitions.
- Independent Settings content scrolling with stable navigation in popup, side panel, and options views.
- Refined default blue palettes, softer dark surfaces, and quieter task toolbar styling; custom palettes are preserved.
- Fixed the Edge action popup height so its content cannot collapse to the header.

## [0.1.2] - 2026-09-27

### Added
- Project scaffold with WXT, Preact, TypeScript, CSS Modules
- Synology API transport layer with typed responses
- API discovery client (SYNO.API.Info)
- Authentication client with 2FA/OTP support
- Session manager with expiry detection
- Download Station Task API client (list, create, pause, resume, delete)
- Download Station Info and Statistics clients
- File Station client for folder browsing
- NAS URL normalization
- Download link validation and classification
- Typed cross-context messaging via @webext-core/messaging
- WXT typed storage with versioned schemas
- Browser adapter for cross-browser compatibility
- Adaptive polling scheduler with chrome.alarms
- Structured error types with user-friendly messages
- Design tokens with light/dark/system themes
- Popup, side panel, and options page entrypoints
- Context menu integration
- Multi-browser build targets (Chrome, Firefox, Edge, Opera)
- i18n architecture with English locale
- Comprehensive unit test suite
- ESLint + Prettier configuration
- Privacy and security documentation
