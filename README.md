# rn-bundle-swapper

[![npm version](https://img.shields.io/npm/v/rn-bundle-swapper.svg)](https://www.npmjs.com/package/rn-bundle-swapper)
[![npm downloads](https://img.shields.io/npm/dw/rn-bundle-swapper.svg)](https://www.npmjs.com/package/rn-bundle-swapper)
[![CI](https://github.com/kagrawal61/rn-bundle-swapper/actions/workflows/ci.yml/badge.svg)](https://github.com/kagrawal61/rn-bundle-swapper/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js ≥ 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

<!-- Add your logo here once created:
<p align="center">
  <img src="assets/logo.png" alt="rn-bundle-swapper" width="180" />
</p>
-->

> **Patch only the JS. Skip the native build. Test in seconds.**

`rn-bundle-swapper` replaces the JavaScript bundle inside a pre-built React Native APK, `.app`, or `.ipa` — then re-signs it — without touching a single line of native code.

> ⚠️ Intended for **internal distribution, QA, and CI workflows** — not for Play Store or App Store submissions.

---

<!-- Add your demo GIF here once recorded:
<p align="center">
  <img src="assets/demo.gif" alt="rn-bundle-swapper demo" width="700" />
</p>
-->

## The problem

Every time you change a line of JavaScript in a React Native app, the standard workflow forces you to wait for a full native rebuild — even though native code didn't change at all.

```
You changed one JS file.
Now wait 3–8 minutes for Gradle/Xcode to recompile native modules,
re-link frameworks, re-package everything…
…just to see your JS change.
```

This is painful during QA cycles, automated testing pipelines, and anywhere you need to test many JS variations against the same native binary.

## The solution

```
rn-bundle-swapper android app-release.apk \
  --jsbundle index.android.bundle \
  --keystore my.keystore --ks-pass android --ks-alias myalias
```

| | Full native rebuild | rn-bundle-swapper |
|---|---|---|
| **Time** | 3–10 min | ~5 sec |
| **Rebuilds native code** | ✅ Yes | ❌ No |
| **Re-signs binary** | ✅ Yes | ✅ Yes |
| **Works in CI** | ✅ Yes | ✅ Yes |
| **Hermes support** | ✅ Yes | ✅ Yes |

---

## How it works

```
┌─────────────────────────┐    ┌──────────────────────┐
│   Your pre-built APK    │    │   New JS bundle      │
│   (native code intact)  │    │   (your JS changes)  │
└────────────┬────────────┘    └──────────┬───────────┘
             │                            │
             └──────────┬─────────────────┘
                        ▼
             ┌──────────────────────┐
             │   rn-bundle-swapper  │
             │                      │
             │  1. Open APK/IPA     │
             │  2. Swap JS bundle   │
             │  3. Copy assets      │
             │  4. Re-sign          │
             └──────────┬───────────┘
                        ▼
             ┌──────────────────────┐
             │  Patched binary      │
             │  Ready to install    │
             │  (~5 seconds total)  │
             └──────────────────────┘
```

Only the JavaScript bundle is replaced. All native code, frameworks, entitlements, and resources remain byte-for-byte identical to the original build.

---

## What changes — and what doesn't

| | Changed | Unchanged |
|---|---|---|
| JS bundle (`index.android.bundle` / `main.jsbundle`) | ✅ | |
| Metro assets (images, fonts) | ✅ if `--copy-assets` | |
| APK/IPA signature | ✅ Re-signed | |
| Native code (Java/Kotlin/ObjC/Swift) | | ✅ |
| Native modules | | ✅ |
| Entitlements & permissions | | ✅ |
| App version & build number | | ✅ |
| Frameworks & dylibs | | ✅ |

The resulting binary **behaves identically** to a full build with the same JS bundle. There is no difference at runtime.

---

## When to use this

**QA and internal testing**
Distribute a base APK/IPA to your QA team once. When a bug is fixed or a feature is ready, swap only the bundle — QA can re-test in seconds without reinstalling a new native build.

**CI/CD pipelines**
Build native binaries once per week (or per native change). Run JS-only patch pipelines on every PR. Dramatically reduce CI minutes and queue time.

**Parallel JS development**
Multiple developers can test different JS branches against the same stable native binary without each waiting for a native build.

**Hot-fix validation**
Validate a critical JS fix on a device before going through a full release cycle.

**Not a fit for:**
- Play Store / App Store submissions (always use a proper signed build)
- Changes that touch native modules or native configuration
- OTA production updates (use CodePush / Expo Updates for that)

---

## Contents

- [Installation](#installation)
- [Requirements](#requirements)
- [CLI Usage](#cli-usage)
  - [Android APK](#android-apk)
  - [iOS Simulator .app](#ios-simulator-app)
  - [iOS Device .ipa](#ios-device-ipa)
  - [Build bundle in-place](#build-bundle-in-place)
  - [Config file](#config-file)
  - [Full CLI reference](#full-cli-reference)
- [Programmatic API](#programmatic-api)
- [Troubleshooting](#troubleshooting)
- [Design notes](#design-notes)
- [Contributing](#contributing)
- [License](#license)

---

## Installation

```sh
# Global CLI
npm install -g rn-bundle-swapper

# Or as a dev dependency (recommended for CI)
npm install --save-dev rn-bundle-swapper
yarn add --dev rn-bundle-swapper
```

---

## Requirements

| Platform | Tools required |
|----------|----------------|
| Android  | Android SDK Build-Tools: `zipalign`, `apksigner` |
| iOS `.app` | Nothing extra (Simulator builds don't need signing) |
| iOS `.ipa` | Xcode Command Line Tools: `codesign`, `unzip`, `zip` |
| All | Node.js ≥ 18 |

**Installing Android SDK Build-Tools:**
```sh
# via Android Studio SDK Manager, or:
sdkmanager "build-tools;34.0.0"
# then ensure $ANDROID_HOME/build-tools/<version>/ is on your PATH
```

---

## CLI Usage

### Android APK

```sh
rn-bundle-swapper android app-release.apk \
  --jsbundle index.android.bundle \
  --keystore my.keystore \
  --ks-pass android \
  --ks-alias myalias \
  --output patched.apk
```

With Metro assets:

```sh
rn-bundle-swapper android app-release.apk \
  --jsbundle index.android.bundle \
  --keystore my.keystore --ks-pass android --ks-alias myalias \
  --copy-assets \
  --output patched.apk
```

---

### iOS Simulator .app

```sh
rn-bundle-swapper ios-app MyApp.app \
  --jsbundle main.jsbundle \
  --output Patched.app
```

---

### iOS Device .ipa

```sh
rn-bundle-swapper ios-ipa MyApp.ipa \
  --jsbundle main.jsbundle \
  --identity "Apple Distribution: Example Corp (TEAMID)" \
  --output Patched.ipa
```

CI mode (fails immediately if the identity is unavailable):

```sh
rn-bundle-swapper ios-ipa MyApp.ipa \
  --jsbundle main.jsbundle \
  --identity "Apple Distribution: Example Corp (TEAMID)" \
  --output Patched.ipa \
  --ci
```

---

### Build bundle in-place

Use `--build-jsbundle` to run Metro (and optionally Hermes) before swapping — no pre-built bundle needed:

```sh
# Android — Hermes enabled by default
rn-bundle-swapper android app-release.apk \
  --build-jsbundle \
  --project-root ./MyApp \
  --keystore my.keystore --ks-pass android --ks-alias myalias \
  --output patched.apk

# iOS — skip Hermes compilation
rn-bundle-swapper ios-ipa MyApp.ipa \
  --build-jsbundle --no-hermes \
  --project-root ./MyApp \
  --identity "Apple Distribution: ..." \
  --output Patched.ipa
```

> When `--build-jsbundle` is used, `--copy-assets` is automatically enabled.

---

### Config file

Store your flags in a JSON file to avoid repeating them in scripts:

```sh
rn-bundle-swapper android app.apk --config swap.json
```

`swap.json`:
```json
{
  "jsbundle": "index.android.bundle",
  "keystore": "my.keystore",
  "ks-pass": "android",
  "ks-alias": "myalias",
  "output": "patched.apk"
}
```

---

### Full CLI reference

#### `android <apkPath>`

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--jsbundle <path>` | ✅ or `--build-jsbundle` | — | Pre-built JS bundle |
| `--build-jsbundle` | — | `false` | Build bundle from project |
| `--project-root <path>` | — | `cwd` | React Native project root |
| `--no-hermes` | — | Hermes on | Skip Hermes compilation |
| `--keystore <path>` | ✅ | — | Android keystore file |
| `--ks-pass <password>` | ✅ | — | Keystore password |
| `--ks-alias <alias>` | ✅ | — | Key alias |
| `--key-pass <password>` | — | — | Key password (if different) |
| `--copy-assets` | — | `false` | Copy Metro assets |
| `-o, --output <path>` | — | `patched.apk` | Output APK path |

#### `ios-app <appPath>`

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--jsbundle <path>` | ✅ or `--build-jsbundle` | — | Pre-built JS bundle |
| `--build-jsbundle` | — | `false` | Build bundle from project |
| `--project-root <path>` | — | `cwd` | React Native project root |
| `--no-hermes` | — | Hermes on | Skip Hermes compilation |
| `--copy-assets` | — | `false` | Copy Metro assets |
| `-o, --output <path>` | — | `Patched.app` | Output `.app` path |

#### `ios-ipa <ipaPath>`

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--jsbundle <path>` | ✅ or `--build-jsbundle` | — | Pre-built JS bundle |
| `--build-jsbundle` | — | `false` | Build bundle from project |
| `--project-root <path>` | — | `cwd` | React Native project root |
| `--no-hermes` | — | Hermes on | Skip Hermes compilation |
| `--identity <identity>` | ✅ | — | Codesign identity string |
| `--copy-assets` | — | `false` | Copy Metro assets |
| `-o, --output <path>` | — | `Patched.ipa` | Output `.ipa` path |
| `--ci` | — | `false` | Fail fast if codesign unavailable |

#### Environment variables

| Variable | Description |
|----------|-------------|
| `RNBS_BANNER_STYLE` | Banner style: `modern` (default), `compact`, `ascii` |

---

## Programmatic API

```ts
import {
  swapAndroid,
  swapIosApp,
  swapIosIpa,
  buildBundle,
} from 'rn-bundle-swapper';
```

All functions are async and throw on failure.

---

### swapAndroid

```ts
await swapAndroid(options: AndroidSwapOptions): Promise<void>
```

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `apkPath` | `string` | ✅ | Path to source APK |
| `jsBundlePath` | `string` | ✅ | Path to JS bundle |
| `keystorePath` | `string` | ✅ | Path to keystore file |
| `keystorePassword` | `string` | ✅ | Keystore password |
| `keyAlias` | `string` | ✅ | Key alias |
| `keyPassword` | `string` | — | Key password (if different) |
| `outputPath` | `string` | ✅ | Output APK path |
| `copyAssets` | `boolean` | — | Copy Metro assets (default: `false`) |

```ts
await swapAndroid({
  apkPath: 'app-release.apk',
  jsBundlePath: 'index.android.bundle',
  keystorePath: 'my.keystore',
  keystorePassword: 'android',
  keyAlias: 'myalias',
  outputPath: 'patched.apk',
  copyAssets: true,
});
```

---

### swapIosApp

```ts
await swapIosApp(options: IosAppSwapOptions): Promise<void>
```

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `appPath` | `string` | ✅ | Path to `.app` directory |
| `jsBundlePath` | `string` | ✅ | Path to JS bundle |
| `outputPath` | `string` | ✅ | Output `.app` path |
| `copyAssets` | `boolean` | — | Copy Metro assets (default: `false`) |

```ts
await swapIosApp({
  appPath: 'MyApp.app',
  jsBundlePath: 'main.jsbundle',
  outputPath: 'Patched.app',
});
```

---

### swapIosIpa

```ts
await swapIosIpa(options: IosIpaSwapOptions): Promise<void>
```

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `ipaPath` | `string` | ✅ | Path to `.ipa` file |
| `jsBundlePath` | `string` | ✅ | Path to JS bundle |
| `identity` | `string` | ✅ | Codesign identity |
| `outputPath` | `string` | ✅ | Output `.ipa` path |
| `ci` | `boolean` | — | Fail fast if codesign unavailable |
| `copyAssets` | `boolean` | — | Copy Metro assets (default: `false`) |

```ts
await swapIosIpa({
  ipaPath: 'MyApp.ipa',
  jsBundlePath: 'main.jsbundle',
  identity: 'Apple Distribution: Example Corp (TEAMID)',
  outputPath: 'Patched.ipa',
  ci: true,
});
```

---

### buildBundle

Build a JS bundle from a React Native project using Metro, with optional Hermes compilation.

```ts
const result = await buildBundle(options: BuildBundleOptions): Promise<BuildBundleResult>
```

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `projectRoot` | `string` | ✅ | React Native project root |
| `platform` | `'android' \| 'ios'` | ✅ | Target platform |
| `hermes` | `boolean` | — | Compile with Hermes (default: `true`) |
| `dev` | `boolean` | — | Build a dev bundle (default: `false`) |
| `entryFile` | `string` | — | Entry file relative to `projectRoot` (auto-detected) |

`BuildBundleResult`:

| Field | Type | Description |
|-------|------|-------------|
| `bundlePath` | `string` | Path to the built (and compiled) bundle |
| `assetsDir` | `string` | Directory containing Metro assets |
| `outDir` | `string` | Temp directory — **caller must remove when done** |

```ts
import { buildBundle, swapAndroid } from 'rn-bundle-swapper';
import fs from 'fs-extra';

const build = await buildBundle({ projectRoot: './MyApp', platform: 'android' });
try {
  await swapAndroid({
    apkPath: 'app-release.apk',
    jsBundlePath: build.bundlePath,
    keystorePath: 'my.keystore',
    keystorePassword: 'android',
    keyAlias: 'myalias',
    outputPath: 'patched.apk',
    copyAssets: true,
  });
} finally {
  await fs.remove(build.outDir);
}
```

---

## Troubleshooting

### Android

**`zipalign: command not found`**
Add Android SDK Build-Tools to your PATH:
```sh
export PATH=$PATH:$ANDROID_HOME/build-tools/34.0.0
```

**`apksigner: command not found`**
Same fix as above. Verify with `apksigner version`.

**`apksigner failed` / signature verification error**
- Confirm the keystore password and alias are correct: `keytool -list -keystore my.keystore`
- Make sure you're signing with the same key as the original APK if installing as an update (signature mismatch will prevent upgrade install)

**App crashes on launch after swap**
- The native code expects Hermes bytecode but you passed a plain JS bundle (or vice versa). Match the Hermes setting to your original build. Use `--no-hermes` if your app was built without Hermes.
- Verify the bundle entry point is correct (`index.android.bundle` is expected at `assets/index.android.bundle` inside the APK)

**`INSTALL_FAILED_UPDATE_INCOMPATIBLE`**
You're trying to install as an upgrade but the signature doesn't match. Uninstall the existing app first, or use the same keystore as the original build.

---

### iOS

**`codesign: command not found`**
Install Xcode Command Line Tools: `xcode-select --install`

**`codesign failed` / "no identity found"**
List available identities:
```sh
security find-identity -v -p codesigning
```
Copy the full identity string exactly, including the team ID in parentheses.

**App crashes immediately after install**
- Check that the bundle name matches what the app expects (`main.jsbundle` for most RN apps)
- Hermes mismatch: make sure `--no-hermes` matches your original build configuration

**IPA installs but shows blank screen**
Assets are missing. Re-run with `--copy-assets`.

---

### Bundle building (`--build-jsbundle`)

**`react-native: command not found`**
The tool looks for `node_modules/.bin/react-native` in your `--project-root`. Run `yarn install` or `npm install` in your project first.

**`hermesc not found` warning**
Hermes compilation will be skipped. This is fine if your app was built without Hermes. To suppress the warning, pass `--no-hermes`.

---

## Design notes

- **Signing**: Android always re-signs (v2 + v4 via `apksigner`). iOS `.app` needs no signing (Simulator). iOS `.ipa` uses `codesign --deep` to re-sign embedded frameworks before signing the app bundle.
- **Passwords**: Keystore passwords are passed to `apksigner` via subprocess environment variables (`env:` scheme), not as CLI arguments — so they are not visible in `ps aux` or system logs.
- **Assets**: Metro asset copying is opt-in (`--copy-assets`). The tool searches common Metro output locations automatically.
- **Hermes**: When `--build-jsbundle` is used, Hermes compilation runs by default. Pass `--no-hermes` to produce a plain JS bundle.
- **Temp files**: All temporary directories are cleaned up in `finally` blocks, including on failure.
- **Config file**: Keys in `--config` JSON are validated against an allowlist before injection into argv, preventing flag injection from untrusted files.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

[MIT](LICENSE) © Kushal Agrawal
