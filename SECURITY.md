# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| latest  | Yes       |

## Reporting a Vulnerability

If you discover a security vulnerability in rn-bundle-swapper, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please email **kagrawal61@gmail.com** with:

- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

You should receive an acknowledgement within 48 hours. We will work with you to understand the issue and coordinate a fix before any public disclosure.

## Scope

This project manipulates APK and IPA files, including re-signing operations. Security-relevant areas include:

- File path handling (zip extraction, temp directories)
- Code signing integrity (apksigner, codesign)
- Command execution (shell commands for build tools)

Thank you for helping keep rn-bundle-swapper safe.
