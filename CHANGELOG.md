# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
