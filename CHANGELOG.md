# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Cypress 14+ compatibility with backward compatibility for older versions
- Compatibility table in README

### Changed
- Event handler for `dev-server:specs:changed` now supports both old and new Cypress event signatures

## [2.0.5] - 2024-07-02

### Added
- Extended logging for static router functionality

## [2.0.4] - 2024-04-03

### Added
- Include types folder in published package ([#1])

## [2.0.3] - 2024-02-05

### Fixed
- Fixed condition logic

## [2.0.2] - 2024-02-05

### Fixed
- Prevent rebuilds due to false positive spec-changed events

## [2.0.1] - 2024-01-12

### Added
- Unit tests and code refactoring

### Fixed
- URL creation for Unix systems

## [2.0.0] - 2024-01-04

### Added
- Preserve folder structure when importing tests
- Improved logging for static mappings

### Changed
- **BREAKING:** `loadBundle` now requires relative paths to files as they are served via `serveStatic`

### Fixed
- Static mapping logging

## [1.2.0] - 2024-01-04

### Added
- Improved logging functionality
- Better filename handling

### Fixed
- Stalling request logging

## [1.1.1] - 2023-08-07

### Improved
- Logging and route sequence handling

## [1.1.0] - 2023-08-07

### Added
- Expose Cypress configuration to callbacks

## [1.0.7] - 2023-05-23

### Added
- Configurable logging functionality

## [1.0.5] - 2023-05-11

### Fixed
- Build and publish process

### Changed
- Use `prepublishOnly` instead of deprecated `prepublish`

## [1.0.4] - 2023-05-11

### Added
- Support for relative paths (initial implementation)

## [1.0.0] - 2023-04-25

### Added
- Initial release
- Express-based dev server for Cypress component testing
- Custom build callback support
- Static file serving
- Test loading utilities
- Build state management
- Basic logging functionality

### Infrastructure
- TypeScript support
- ESLint configuration
- CircleCI integration
- Unit test setup

[Unreleased]: https://github.com/fochlac/cypress-ct-custom-devserver/compare/v2.0.5...HEAD
[2.0.5]: https://github.com/fochlac/cypress-ct-custom-devserver/compare/v2.0.4...v2.0.5
[2.0.4]: https://github.com/fochlac/cypress-ct-custom-devserver/compare/v2.0.3...v2.0.4
[2.0.3]: https://github.com/fochlac/cypress-ct-custom-devserver/compare/v2.0.2...v2.0.3
[2.0.2]: https://github.com/fochlac/cypress-ct-custom-devserver/compare/v2.0.1...v2.0.2
[2.0.1]: https://github.com/fochlac/cypress-ct-custom-devserver/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/fochlac/cypress-ct-custom-devserver/compare/v1.2.0...v2.0.0
[1.2.0]: https://github.com/fochlac/cypress-ct-custom-devserver/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/fochlac/cypress-ct-custom-devserver/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/fochlac/cypress-ct-custom-devserver/compare/v1.0.7...v1.1.0
[1.0.7]: https://github.com/fochlac/cypress-ct-custom-devserver/compare/v1.0.5...v1.0.7
[1.0.5]: https://github.com/fochlac/cypress-ct-custom-devserver/compare/v1.0.4...v1.0.5
[1.0.4]: https://github.com/fochlac/cypress-ct-custom-devserver/compare/v1.0.0...v1.0.4
[1.0.0]: https://github.com/fochlac/cypress-ct-custom-devserver/releases/tag/1.0.0

[#1]: https://github.com/fochlac/cypress-ct-custom-devserver/issues/1
