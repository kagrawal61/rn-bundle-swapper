# Contributing to rn-bundle-swapper

Thank you for your interest in contributing! This document covers how to get the project running locally, the development workflow, and the pull request process.

---

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Workflow](#workflow)
- [Commit Style](#commit-style)
- [Pull Requests](#pull-requests)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)

---

## Development Setup

**Prerequisites**

- Node.js ≥ 20 (use [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm) to manage versions)
- Yarn (`npm install -g yarn`)
- Android SDK Build-Tools (`zipalign`, `apksigner`) — for Android tests
- Xcode Command Line Tools — for iOS tests on macOS

**Clone and install**

```sh
git clone https://github.com/kagrawal61/rn-bundle-swapper.git
cd rn-bundle-swapper
yarn install
```

**Build**

```sh
yarn build          # compile TypeScript → dist/
yarn type-check     # type-check without emitting
```

**Lint & format**

```sh
yarn lint           # ESLint
```

**Tests**

```sh
yarn test           # Jest
```

**All checks at once**

```sh
yarn check          # lint + type-check + test
```

**Sample app (optional, for end-to-end testing)**

```sh
yarn bootstrap:sample   # install dependencies for the sample React Native app
```

---

## Project Structure

```
src/
  cli.ts              — Commander CLI entry point
  index.ts            — Public API exports and TypeScript interfaces
  android/
    swap.ts           — APK bundle swap + zipalign + apksigner
  ios/
    appSwap.ts        — .app (Simulator) bundle swap
    ipaSwap.ts        — .ipa bundle swap + codesign + repack
  utils/
    bundle.ts         — react-native bundle + hermesc compilation
    logger.ts         — CLI logger and banner
    temp.ts           — OS temp directory helper
    zip.ts            — Recursive directory-to-zip helper
```

---

## Workflow

1. Fork the repo and create a branch from `main`:
   ```sh
   git checkout -b feat/your-feature
   ```
2. Make your changes with tests where relevant.
3. Run `yarn check` and ensure it passes cleanly.
4. Commit following the [commit style](#commit-style) below.
5. Push and open a pull request against `main`.

---

## Commit Style

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short summary>
```

| Type       | When to use                                 |
|------------|---------------------------------------------|
| `feat`     | New feature                                 |
| `fix`      | Bug fix                                     |
| `refactor` | Code change that is neither fix nor feature |
| `docs`     | Documentation only                          |
| `test`     | Adding or updating tests                    |
| `chore`    | Build, CI, tooling changes                  |

Examples:
```
feat(android): add --copy-assets flag
fix(ios): correct codesign --deep flag for embedded frameworks
docs: update CLI reference in README
```

---

## Pull Requests

- Keep PRs focused — one feature or fix per PR.
- Update the `CHANGELOG.md` `[Unreleased]` section.
- Add or update tests for any logic you change.
- PRs that break the `yarn check` pipeline will not be merged.

---

## Reporting Bugs

Use the [Bug Report](.github/ISSUE_TEMPLATE/bug_report.md) issue template. Include:

- The exact command or code you ran
- The full error output
- Your OS, Node.js version, and React Native version

---

## Requesting Features

Use the [Feature Request](.github/ISSUE_TEMPLATE/feature_request.md) issue template. Describe:

- The problem you're trying to solve
- The proposed solution or API
- Any alternatives you've considered
