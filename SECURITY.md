# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | ✅        |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report security issues by emailing the maintainer directly (see the `author` field in `package.json`), or by using [GitHub's private vulnerability reporting](https://github.com/kagrawal61/rn-bundle-swapper/security/advisories/new).

Include:
- A description of the vulnerability and its potential impact
- Steps to reproduce or a proof-of-concept
- Any suggested mitigations

You will receive a response within 72 hours. Once confirmed, a patched release will be published and the vulnerability will be disclosed publicly after affected users have had reasonable time to update.

## Security Notes

- **Keystore passwords** are passed to `apksigner` via subprocess environment variables (`env:` scheme), not as CLI arguments, to prevent exposure in process listings (`ps aux`).
- **Config file keys** are validated against a whitelist before injection into CLI arguments to prevent flag injection from untrusted config files.
- This tool is intended for **internal distribution and QA workflows only**, not for signing binaries destined for the Play Store or App Store.
