# Contributing to United Wallet

Thank you for your interest in contributing to **United Wallet**! As an open-source non-custodial multi-chain wallet, we welcome contributions from the community—whether it's reporting bugs, improving documentation, suggesting features, or writing code.

---

## Table of Contents

- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Features](#suggesting-features)
  - [Improving Documentation](#improving-documentation)
  - [Contributing Code](#contributing-code)
- [Local Development Setup](#local-development-setup)
- [Git Workflow & Branching](#git-workflow--branching)
- [Coding Standards & Conventions](#coding-standards--conventions)
- [Pull Request Process](#pull-request-process)

---

## How Can I Contribute?

### Reporting Bugs

Before creating a bug report:
1. Check the [GitHub Issues](https://github.com/unitednetwork-wallet/United-Network-Wallet/issues) to make sure the issue hasn't already been reported.
2. Check the [Documentation / Wiki](https://github.com/unitednetwork-wallet/United-Network-Wallet/wiki) for known behaviors.
3. If reporting a **security vulnerability**, do **NOT** open a public issue. Follow the instructions in [SECURITY.md](SECURITY.md).

When submitting a bug:
- Use the **Bug Report Template**.
- Provide detailed steps to reproduce the issue, your browser version, OS, and any relevant console logs.

### Suggesting Features

We welcome new ideas! To request a feature:
- Use the **Feature Request Template** in GitHub Issues.
- Clearly describe the use case, why this feature is valuable, and any proposed implementation details.

### Improving Documentation

Documentation improvements (clarifications, fixing typos, adding examples) are always appreciated:
- Documentation articles and developer guides can be proposed via Pull Requests or directly in the [GitHub Wiki](https://github.com/unitednetwork-wallet/United-Network-Wallet/wiki).

---

## Local Development Setup

1. **Fork & Clone:**
   ```bash
   git clone https://github.com/<your-username>/United-Network-Wallet.git
   cd United-Network-Wallet
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   ```bash
   cp .env.example .env
   ```
   Fill in any required RPC URLs or API endpoints in `.env`.

4. **Run Dev Server:**
   ```bash
   npm run dev
   ```

5. **Lint & Type Check:**
   ```bash
   npm run lint
   ```

---

## Git Workflow & Branching

- Base all feature work on the latest `main` branch.
- Use descriptive branch names:
  - `feat/feature-name` (new features)
  - `fix/bug-description` (bug fixes)
  - `docs/update-wiki-links` (documentation changes)
  - `refactor/component-cleanup` (code refactoring)

### Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

```text
<type>(<scope>): <subject>

# Examples:
feat(swap): add 1inch fusion cross-chain provider
fix(nfc): handle fido buffer overflow on android chrome
docs(wiki): update card interaction protocol guide
refactor(auth): simplify webcrypto storage encryptor
```

---

## Coding Standards & Conventions

- **Vue 3 Composition API**: Use `<script setup lang="ts">`.
- **TypeScript**: Ensure strict typing; avoid using `any` wherever possible.
- **Security-First**: Never log private keys, mnemonic seeds, or sensitive payload data to the console in production mode.
- **SCSS/CSS**: Follow established BEM or modular SCSS styling patterns used in `src/assets/`.

---

## Pull Request Process

1. Ensure all code passes linting (`npm run lint`).
2. Test your changes thoroughly across supported browsers (Chrome, Safari/iOS for NFC/FIDO).
3. Ensure no unnecessary files or sensitive keys are committed.
4. Fill out the [Pull Request Template](.github/pull_request_template.md).
5. Link any related GitHub issues in your PR description (e.g., `Fixes #123`).

Thank you for contributing to United Wallet!
