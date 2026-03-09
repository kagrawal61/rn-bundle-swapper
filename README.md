# rn-bundle-swapper

[![npm version](https://img.shields.io/npm/v/rn-bundle-swapper.svg)](https://www.npmjs.com/package/rn-bundle-swapper)
[![CI](https://github.com/kagrawal61/rn-bundle-swapper/actions/workflows/ci.yml/badge.svg)](https://github.com/kagrawal61/rn-bundle-swapper/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js ≥ 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

> Swap the JavaScript bundle inside a pre-built React Native APK, `.app`, or `.ipa` — without rebuilding native code.

**rn-bundle-swapper** dramatically cuts iteration time during QA and internal testing by patching only the JS layer of a built binary. It handles signing automatically and works in both interactive and CI environments.

> **Note:** This tool is intended for internal distribution, QA, and rapid iteration — not for submitting to the Play Store or App Store.

---

## Contents

- [Why](#why)
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
  - [swapAndroid](#swapandroid)
  - [swapIosApp](#swapiosapp)
  - [swapIosIpa](#swapiosipa)
  - [buildBundle](#buildbundle)
- [Design notes](#design-notes)
- [Contributing](#contributing)
- [License](#license)

---

## Why

Rebuilding a React Native app from scratch just to test a JS change takes minutes of native compilation. **rn-bundle-swapper** patches the bundle directly into an existing binary in seconds:

| Workflow | Time |
|----------|------|
| Full native rebuild | 2–10 min |
| `rn-bundle-swapper` | ~5 sec |

---

## Installation

```sh
# Global CLI
npm install -g rn-bundle-swapper

# Or as a dev dependency
npm install --save-dev rn-bundle-swapper
yarn add --dev rn-bundle-swapper
```

---

## Requirements

| Platform | Tools required |
|----------|---------------|
| Android  | Android SDK Build-Tools: `zipalign`, `apksigner` |
| iOS `.app` | Nothing extra (no signing needed for Simulator) |
| iOS `.ipa` | Xcode Command Line Tools: `codesign`, `unzip`, `zip` |
| All | Node.js ≥ 18 |

---

## CLI Usage

### Android APK

Replace the bundle in an APK and re-sign it:

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

In CI (fails fast if the identity is unavailable):

```sh
rn-bundle-swapper ios-ipa MyApp.ipa \
  --jsbundle main.jsbundle \
  --identity "Apple Distribution: Example Corp (TEAMID)" \
  --output Patched.ipa \
  --ci
```

---

### Build bundle in-place

Use `--build-jsbundle` to have the tool run Metro and optionally Hermes before swapping — no pre-built bundle required:

```sh
# Android — build with Hermes (default), then swap
rn-bundle-swapper android app-release.apk \
  --build-jsbundle \
  --project-root ./MyApp \
  --keystore my.keystore --ks-pass android --ks-alias myalias \
  --output patched.apk

# iOS — build without Hermes
rn-bundle-swapper ios-ipa MyApp.ipa \
  --build-jsbundle --no-hermes \
  --project-root ./MyApp \
  --identity "Apple Distribution: ..." \
  --output Patched.ipa
```

When `--build-jsbundle` is used, `--copy-assets` is enabled automatically.

---

### Config file

Pass a JSON file instead of individual flags:

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
| `--jsbundle <path>` | ✅ (or `--build-jsbundle`) | — | Pre-built JS bundle |
| `--build-jsbundle` | — | `false` | Build bundle from project |
| `--project-root <path>` | — | `cwd` | React Native project root |
| `--no-hermes` | — | Hermes on | Skip Hermes compilation |
| `--keystore <path>` | ✅ | — | Android keystore file |
| `--ks-pass <password>` | ✅ | — | Keystore password |
| `--ks-alias <alias>` | ✅ | — | Key alias |
| `--key-pass <password>` | — | — | Key password (if different from keystore password) |
| `--copy-assets` | — | `false` | Copy Metro assets |
| `-o, --output <path>` | — | `patched.apk` | Output APK path |

#### `ios-app <appPath>`

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--jsbundle <path>` | ✅ (or `--build-jsbundle`) | — | Pre-built JS bundle |
| `--build-jsbundle` | — | `false` | Build bundle from project |
| `--project-root <path>` | — | `cwd` | React Native project root |
| `--no-hermes` | — | Hermes on | Skip Hermes compilation |
| `--copy-assets` | — | `false` | Copy Metro assets |
| `-o, --output <path>` | — | `Patched.app` | Output `.app` path |

#### `ios-ipa <ipaPath>`

| Flag | Required | Default | Description |
|------|----------|---------|-------------|
| `--jsbundle <path>` | ✅ (or `--build-jsbundle`) | — | Pre-built JS bundle |
| `--build-jsbundle` | — | `false` | Build bundle from project |
| `--project-root <path>` | — | `cwd` | React Native project root |
| `--no-hermes` | — | Hermes on | Skip Hermes compilation |
| `--identity <identity>` | ✅ | — | Codesign identity string |
| `--copy-assets` | — | `false` | Copy Metro assets |
| `-o, --output <path>` | — | `Patched.ipa` | Output `.ipa` path |
| `--ci` | — | `false` | Fail immediately if codesign identity is unavailable |

#### Environment variables

| Variable | Description |
|----------|-------------|
| `RNBS_BANNER_STYLE` | Banner style: `modern` (default), `compact`, or `ascii` |

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
| `keyPassword` | `string` | — | Key password |
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
| `ci` | `boolean` | — | Fail fast if codesign unavailable (default: `false`) |
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
| `outDir` | `string` | Temp directory — **caller must remove this when done** |

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

## Design notes

- **Signing**: Android always re-signs (v2 + v4 via `apksigner`). iOS `.app` needs no signing (Simulator). iOS `.ipa` uses `codesign --deep`.
- **Passwords**: Keystore passwords are passed to `apksigner` via subprocess environment variables (`env:` scheme) — not as CLI arguments — so they are not visible in `ps aux`.
- **Assets**: Metro asset copying is opt-in (`--copy-assets` / `copyAssets: true`). The tool searches common Metro output locations automatically.
- **Hermes**: When `--build-jsbundle` is used, Hermes compilation runs by default. Pass `--no-hermes` to produce a plain JS bundle.
- **Temp files**: All temporary files are cleaned up in `finally` blocks, including on failure.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

[MIT](LICENSE) © Kushal Agrawal
