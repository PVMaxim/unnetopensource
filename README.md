# United Network — Non-Custodial Multi-Chain Wallet & Swap

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Vue 3](https://img.shields.io/badge/Vue-3.5-brightgreen.svg)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-purple.svg)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)

A modern, high-performance non-custodial Web3 application for managing digital assets, multi-chain swaps, and hardware card authentication across major blockchain ecosystems.

---

## ✨ Features

- **Non-Custodial by Design:** Private keys stay offline and under user control. All cryptographic signatures occur client-side.
- **NFC Hardware Card Integration:** Direct interaction with NFC security smart cards for hardware-level key isolation and transaction signing.
- **Multi-Chain Asset Management:** Native support for balances, transfers, and transaction history across:
  - **EVM Networks:** Ethereum, BNB Chain (BSC), Polygon, Arbitrum, Base, Avalanche, Katana
  - **Non-EVM Networks:** Bitcoin, Solana, TON, TRON, XRP Ledger, Venom, Canton, COTI
- **Cross-Chain & DEX Swaps:** Aggregated swaps powered by 1inch Fusion, Web3World, Changelly, Bridgers, Omniston, and more.
- **WalletConnect v2:** Connect to decentralized applications (dApps) across ecosystems via QR code or direct pairing.
- **WebCrypto Local Security:** Local storage items are encrypted client-side using WebCrypto (AES-CBC + PBKDF2).
- **Internationalization (i18n):** Multi-language interface support out of the box.

---

## 🛠️ Tech Stack

- **Framework:** [Vue 3](https://vuejs.org/) (Composition API, `<script setup>`)
- **State Management:** [Vuex](https://vuex.vuejs.org/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Languages:** TypeScript, JavaScript, SCSS
- **Web3 Libraries:** `ethers.js`, `@solana/web3.js`, `@ton/ton`, `tronweb`, `bitcoinjs-lib`, `xrpl`, `@canton-network/*`, `@1inch/cross-chain-sdk`
- **WebAssembly (WASM):** High-performance cryptography and barcode/QR scanning modules

---

## 🚀 Quick Start

### 1. Prerequisites

- **Node.js:** `v18.x` or `v20.x` (LTS recommended)
- **Package Manager:** `npm` (v9+) or `yarn`

### 2. Clone Repository

```bash
git clone https://github.com/PVMaxim/unnetopensource.git
cd unnetopensource
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Copy the example configuration file:

```bash
cp .env.example .env
```

Open `.env` and set your configuration values:
- `UNITED_CARDS_KEY`: A secure random string for client-side localStorage encryption.
- `UNITED_CARDS_IV_KEY`: A 32-character string used for cryptographic initialization.
- `UNITED_CONNECT_PROJECT_ID`: Your WalletConnect Cloud Project ID ([cloud.walletconnect.com](https://cloud.walletconnect.com)).

### 5. Run Local Development Server

```bash
npm run dev
```

The application will be accessible at:  
👉 **`http://localhost:8081`**

---

## 📦 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts Vite local development server with HMR |
| `npm run build` | Compiles and minifies source code for production |
| `npm run preview` | Locally previews the production build |
| `npm run type-check` | Runs TypeScript compiler checks without emitting files |
| `npm run lint` | Analyzes and automatically fixes ESLint issues |

---

## 📁 Project Structure

```text
├── public/               # Build output artifacts (compiled distribution)
├── src/
│   ├── api/              # Blockchain providers, RPCs, swap aggregators, encryption
│   ├── assets/           # SCSS styles, typography, SVG icons, images
│   ├── components/       # Reusable UI components (buttons, modals, QR scanner)
│   ├── features/         # Feature-specific modules (e.g. swap form)
│   ├── layouts/          # Page layouts (navigation, header, sidebar)
│   ├── locales/          # Localization JSON files (en, ru, etc.)
│   ├── modules/          # Core modules (WalletConnect, token detector, chat)
│   ├── pages/            # Application views and routing pages
│   ├── plugins/          # Vue plugins (i18n, directives, helpers)
│   ├── public/           # Static assets, webmanifest, favicons, audio
│   ├── router/           # Vue Router navigation rules & route guards
│   ├── store/            # Vuex state modules
│   └── workers/          # Web Workers for asynchronous cryptographic operations
├── types/                # Ambient TypeScript declarations
├── .env.example          # Template for required environment variables
├── package.json          # Project dependencies and npm scripts
├── tsconfig.json         # TypeScript configuration
└── vite.config.js        # Vite bundler configuration & plugins
```

---

## 🔒 Security & Privacy

- **Client-Side Cryptography:** Private keys never touch any centralized servers. Keys remain in the hardware security element or are generated and held purely in client-side ephemeral memory.
- **Encrypted Local Storage:** Sensitive persisted preferences are encrypted using AES-CBC with PBKDF2 derived keys via the standard WebCrypto API.
- **No Telemetry Tracking:** The application does not collect user tracking or telemetry metrics.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to open an Issue or submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is open-source and licensed under the [MIT License](LICENSE).
