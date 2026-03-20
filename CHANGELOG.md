# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `bundleEntry` option on `AndroidSwapOptions` — override the bundle entry path inside the APK (default: `assets/index.android.bundle`) for apps with a custom Metro `bundleName`
- `bundleName` option on `IosAppSwapOptions` and `IosIpaSwapOptions` — override the bundle filename inside the `.app` (default: `main.jsbundle`) for apps with a custom bundle filename
- `format:check` script (`prettier --check "src/**/*.ts"`) wired into the pre-commit hook, `check` script, and CI workflow to enforce consistent formatting

## [0.1.0] - 2025-01-20

### Added
- Initial release
- `swapAndroid` — replace JS bundle in an APK and re-sign with `zipalign` + `apksigner`
- `swapIosApp` — replace JS bundle in a Simulator `.app` directory
- `swapIosIpa` — replace JS bundle in a `.ipa`, re-sign with `codesign`, repack
- `buildBundle` — build a React Native JS bundle via Metro with optional Hermes compilation
- CLI commands: `android`, `ios-app`, `ios-ipa`
- `--build-jsbundle` / `--project-root` / `--no-hermes` flags for in-place bundle building
- `--copy-assets` flag for Metro asset copying (default: on)
- `--config <file.json>` support for file-based CLI configuration
- `RNBS_BANNER_STYLE` env var for banner style customisation (`modern` / `compact` / `ascii`)
- TypeScript-first API with full type exports
