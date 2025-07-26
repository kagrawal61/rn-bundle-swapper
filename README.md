# rn-bundle-swapper

A cross-platform utility for swapping or updating the JavaScript bundle inside existing React Native Android APKs and iOS .app/.ipa files.

## Overview

**rn-bundle-swapper** is a CLI and library for developers who need to update the JS bundle in a built mobile binary—without rebuilding the entire app. It supports both Android and iOS, and can:

- Replace the JS bundle in an APK, .app, or .ipa
- Optionally build a new bundle from a React Native project
- Optionally copy Metro assets
- Re-sign the binary as needed (Android: always, iOS: for IPA)
- Support both interactive and CI flows

This tool is intended for internal distribution, QA, and rapid iteration—not for uploading to app stores.

---

## Features

- **Android APK**:
  - Replace `assets/index.android.bundle` (and optionally assets)
  - Requires user-supplied keystore for signing
  - Uses `zipalign` and `apksigner` for final APK
- **iOS .app** (Simulator):
  - Replace `main.jsbundle` (and optionally assets)
  - No signing required
- **iOS .ipa** (Device):
  - Unpack IPA, replace bundle, re-sign with provided identity, repackage
  - Interactive or CI-friendly identity selection
- **Flexible bundle source**: Use a pre-built bundle or build from a project root
- **CLI and programmatic API**

---

## Requirements

- **Android**:
  - Android SDK Build-Tools (zipalign, apksigner)
  - User must provide keystore, password, alias
- **iOS**:
  - Xcode command-line tools (codesign, security)
  - For IPA: identity must be provided in CI
- **Node.js**: v18+
- **TypeScript**: for development

---

## Command-Line Interface (CLI)

**rn-bundle-swapper** ships with a powerful CLI for fast, scriptable bundle swapping and signing.

### Why a CLI?

- **Fast:** Patch and sign binaries in seconds.
- **Scriptable:** Integrate with CI/CD or custom scripts.
- **Consistent:** Standardizes the patching process for your team.
- **Accessible:** No need to write code—just run a command.

### Basic Usage

```sh
# Android APK
rn-bundle-swapper android app-release-unsigned.apk \
  --jsbundle index.android.bundle \
  --keystore my.keystore --ks-pass android --ks-alias myalias \
  --output patched.apk

# iOS Simulator .app
rn-bundle-swapper ios-app MyApp.app \
  --jsbundle main.jsbundle \
  --output Patched.app

# iOS Device .ipa (with CI-friendly signing)
rn-bundle-swapper ios-ipa MyApp.ipa \
  --jsbundle main.jsbundle \
  --identity "Apple Distribution: ..." \
  --output Patched.ipa \
  --ci
```

### CLI Options

| Option                | Description                                      |
|-----------------------|--------------------------------------------------|
| `-o, --output`        | Output file or directory                         |
| `--jsbundle`          | Path to pre-built JS bundle                      |
| `--build-jsbundle`    | Build bundle from project (see `--project-root`) |
| `--no-hermes`         | Build bundle without Hermes                      |
| `--copy-assets`       | Copy Metro assets (default: false)               |
| `--project-root`      | Project root for bundle build                    |
| `--keystore`          | (Android) Keystore file (required)               |
| `--ks-pass`           | (Android) Keystore password (required)           |
| `--ks-alias`          | (Android) Key alias (required)                   |
| `--key-pass`          | (Android) Key password                           |
| `--identity`          | (iOS IPA) Codesign identity (required with --ci) |
| `--ci`                | Non-interactive mode (fail if identity missing)  |

---

## Usage as a Library

### Programmatic API (TypeScript)

```ts
import { swapAndroid, swapIosApp, swapIosIpa } from 'rn-bundle-swapper';

// Android
await swapAndroid({
  apkPath: 'app-release-unsigned.apk',
  jsBundlePath: 'index.android.bundle',
  keystorePath: 'my.keystore',
  keystorePassword: 'android',
  keyAlias: 'myalias',
  keyPassword: 'android',
  outputPath: 'patched.apk',
  copyAssets: true,
});

// iOS Simulator
await swapIosApp({
  appPath: 'MyApp.app',
  jsBundlePath: 'main.jsbundle',
  outputPath: 'Patched.app',
});

// iOS Device
await swapIosIpa({
  ipaPath: 'MyApp.ipa',
  jsBundlePath: 'main.jsbundle',
  identity: 'Apple Distribution: ...',
  outputPath: 'Patched.ipa',
  ci: true,
});
```

---

## Design Decisions

- **Signing**: Android always requires a keystore; iOS IPA requires identity in CI, prompts in interactive mode.
- **Bundle build**: Accepts a project root, falls back to cwd.
- **Assets**: Copying Metro assets is optional (default: off).
- **Distribution**: Not intended for Play Store/App Store submission—internal use only.
- **TypeScript-first**: API and CLI are both typed and documented.

---

## License
MIT 