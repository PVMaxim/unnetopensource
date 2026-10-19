# Security Policy

The United Wallet team takes the security of our non-custodial wallet and its users very seriously. As a decentralized, client-side application handling sensitive cryptographic operations and hardware authentication, maintaining a secure codebase is our top priority.

## Supported Versions

We actively provide security patches and updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| `main`  | :white_check_mark: |
| Latest Release | :white_check_mark: |
| Older Releases | :x: |

Please ensure you are running the latest version before reporting issues.

## Reporting a Vulnerability

**DO NOT file a public GitHub Issue for security vulnerabilities, especially those that could compromise user funds, private keys, seed phrases, or cryptographic secrets.**

### How to Report

To report a vulnerability responsibly, please use one of the following methods:

1. **GitHub Private Vulnerability Reporting (Recommended):**
   - Go to the [Security Advisories tab](https://github.com/unitednetwork-wallet/United-Network-Wallet/security/advisories) on GitHub.
   - Click **"Report a vulnerability"** to open a private advisory draft.

2. **Email Disclosure:**
   - If you cannot use GitHub Security Advisories, send an encrypted or direct email detailing the vulnerability to:
   - `info@unitednetwork.cards` (or contact the repository maintainer directly via GitHub profile: [@unitednetwork-wallet](https://github.com/unitednetwork-wallet)).

### What to Include in Your Report

To help us triage and resolve the issue quickly, please include:
- A clear description of the vulnerability and its potential impact.
- Step-by-step reproduction instructions or a minimal Proof of Concept (PoC).
- Affected components (e.g., NFC interaction, WebCrypto storage, swap aggregator service, specific chain manager).
- Environment details (browser version, OS, hardware card model if applicable).

## Security Best Practices for Users & Developers

- **Non-Custodial Guarantee:** Never share your seed phrase, private keys, or PIN code with anyone. Official maintainers will never ask for them.
- **Client-Side Storage:** Verify that private keys and seeds remain encrypted client-side using WebCrypto (AES-CBC + PBKDF2).
- **Environment Isolation:** Do not expose sensitive API keys or RPC credentials in frontend source code.

## Response SLA

- **Acknowledgment:** Within 24–48 hours of initial report.
- **Assessment & Triage:** Within 3–5 business days.
- **Fix & Public Advisory:** A patch will be prepared in a private fork and released alongside a public CVE/Advisory once resolved.

Thank you for helping keep the United Wallet ecosystem safe!
