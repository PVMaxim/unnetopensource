# United Wallet — Non-Custodial Multi-Chain Wallet & Swap

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

Open `.env` and configure the following variables:

| Variable | Required | Description | Example |
|---|---|---|---|
| `UNITED_CONNECT_PROJECT_ID` | **Yes** | WalletConnect Cloud Project ID. Required for WalletConnect v2 relay protocol, pairing with dApps, and signing sessions. Get a free project ID at [cloud.walletconnect.com](https://cloud.walletconnect.com). | `a63fbec4294db4608b7ad03d159949f2` |
| `UNITED_CARDS_KEY` | **Yes** | Master passphrase used by PBKDF2 to derive 256-bit AES-CBC encryption keys for card secrets in browser localStorage. In production, provide a strong random secret (32+ chars). | `your-secure-encryption-passphrase-32+` |
| `UNITED_CARDS_IV_KEY` | **Yes** | 32-character string used as a fallback initialization vector (IV) for local decryption compatibility. | `example-iv-fallback-32-chars-long!` |
| `VITE_WALLET_CONNECT_URL` | Optional | Custom origin/URL broadcasted in WalletConnect session metadata. If left blank, it automatically defaults to `window.location.origin`. | `https://your-wallet-domain.com` |

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

## 🌐 Blockchain Manifests & Network Configuration (`src/api/manifests/`)

United Wallet uses a declarative, **Manifest-Driven Architecture** to manage all supported blockchains. Instead of hardcoding node endpoints, block explorers, and asset lists inside UI components, every blockchain is completely configured via a self-contained JSON manifest in [`src/api/manifests/`](src/api/manifests/) and validated at runtime using Zod schemas in [`src/api/manifests.ts`](src/api/manifests.ts).

### 📋 Supported Chains & Manifest Mapping

| Blockchain | RPC Identifier | Manifest File | Network Type (`type`) |
|---|---|---|---|
| **Ethereum** | `ETH` | [`src/api/manifests/ethereum.json`](src/api/manifests/ethereum.json) | `evm` |
| **BNB Smart Chain** | `BSC` | [`src/api/manifests/binance.json`](src/api/manifests/binance.json) | `evm` |
| **Polygon** | `POLYGON` | [`src/api/manifests/polygon.json`](src/api/manifests/polygon.json) | `evm` |
| **Arbitrum One** | `ARBITRUM` | [`src/api/manifests/arbitrum.json`](src/api/manifests/arbitrum.json) | `evm` |
| **Base** | `BASE` | [`src/api/manifests/base.json`](src/api/manifests/base.json) | `evm` |
| **Avalanche C-Chain** | `AVALANCHE` | [`src/api/manifests/avalanche.json`](src/api/manifests/avalanche.json) | `evm` |
| **Katana** | `KATANA` | [`src/api/manifests/katana.json`](src/api/manifests/katana.json) | `evm` |
| **Solana** | `SOLANA` | [`src/api/manifests/solana.json`](src/api/manifests/solana.json) | `solana` |
| **Solana Devnet** | `SOLANA_DEVNET` | [`src/api/manifests/solana-devnet.json`](src/api/manifests/solana-devnet.json) | `solana` |
| **TON Network** | `TON` | [`src/api/manifests/ton.json`](src/api/manifests/ton.json) | `ton` |
| **TRON** | `TRON` | [`src/api/manifests/tron.json`](src/api/manifests/tron.json) | `tron` |
| **Bitcoin** | `BTC` | [`src/api/manifests/bitcoin.json`](src/api/manifests/bitcoin.json) | `bitcoin` |
| **Bitcoin Testnet** | `BTC_TESTNET` | [`src/api/manifests/bitcoin-testnet.json`](src/api/manifests/bitcoin-testnet.json) | `bitcoin` |
| **XRP Ledger** | `XRP` | [`src/api/manifests/xrpl.json`](src/api/manifests/xrpl.json) | `xrpl` |
| **Venom** | `VENOM` | [`src/api/manifests/venom.json`](src/api/manifests/venom.json) | `venom` |
| **COTI** | `COTI` | [`src/api/manifests/coti.json`](src/api/manifests/coti.json) | `coti` |
| **Canton (Devnet / Testnet)** | `CANTON_DEV` / `CANTON_TEST` | [`src/api/manifests/canton-devnet.json`](src/api/manifests/canton-devnet.json) | `canton` |
| **Cross-Chain Swap Assets** | — | [`src/api/manifests/swap-tokens.json`](src/api/manifests/swap-tokens.json) | Aggregated catalog |

---

### 🧩 Manifest JSON Structure & Schema

Each manifest conforms to `BlockchainManifestSchema` ([`src/api/manifests.ts`](src/api/manifests.ts)):

#### 1. Common Fields (Required across all chains)

```json
{
  "version": 1,
  "name": "Ethereum",
  "type": "evm",
  "priceProvider": {
    "type": "coingecko",
    "blockchain": "ethereum",
    "url": "https://api.coingecko.com/api/v3"
  },
  "nativeToken": {
    "name": "Ether",
    "symbol": "ETH",
    "ticker": "ethereum"
  },
  "tokens": {
    "mandatory": [
      {
        "address": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "name": "USD Coin",
        "symbol": "USDC",
        "decimals": 6,
        "ticker": "usd-coin"
      }
    ],
    "all": "https://tokens.uniswap.org"
  },
  "blockExplorer": {
    "transaction": "https://etherscan.io/tx/{id}"
  }
}
```

- **`priceProvider`**: Defines where token and coin market prices are fetched from (`type: "coingecko"`, `blockchain`: platform ID on CoinGecko, `url`: price API URL).
- **`nativeToken`**: Native currency metadata used for primary account balances and gas estimations.
- **`tokens.mandatory`**: An array of tokens automatically displayed on the main dashboard for all users.
- **`tokens.all`**: Either an array of token objects or a remote URL pointing to a standard token list JSON (e.g. Uniswap token list format).
- **`blockExplorer.transaction`**: URL pattern used for "View in Explorer" links; `{id}` is replaced with the transaction hash/ID.

#### 2. Network-Specific Fields (`type`)

Depending on `"type"`, specific connectivity parameters are required:

##### `type: "evm"` (Ethereum, BSC, Polygon, Arbitrum, Base, Avalanche, Katana)
- **`chainId`**: Numeric network chain ID (e.g. `1` for Ethereum, `56` for BSC, `137` for Polygon).
- **`rpcUrl`**: JSON-RPC HTTP endpoint (e.g. Infura, Alchemy, QuickNode, or public RPC).
- **`scannerApiUrl`**: Etherscan-compatible REST API endpoint (used for transaction history and token balance indexing).
- **`multicallAddress`** *(optional)*: Contract address of Multicall3 for batched balance queries.

##### `type: "solana"`
- **`rpcUrl`**: Solana JSON-RPC endpoint (e.g. `https://api.mainnet-beta.solana.com`).
- **`rpcWsUrl`** *(optional)*: Solana WebSocket endpoint for real-time subscription updates.
- **`scannerApiUrl`** *(optional)*: Explorer API host (e.g. Solscan API).

##### `type: "ton"`
- **`apiBaseUrl`**: TON HTTP API v2 / TonCenter endpoint (e.g. `https://toncenter.com/api/v2/jsonRPC`).

##### `type: "tron"`
- **`rpcUrl`**: TronGrid / FullNode HTTP endpoint (e.g. `https://api.trongrid.io`).
- **`scannerApiHost`**: TronScan API host (e.g. `https://apilist.tronscanapi.com`).
- **`multicallAddress`** *(optional)*: Multicall smart contract address.

##### `type: "bitcoin"`
- **`apiBaseUrl`**: Esplora / Mempool.space REST API URL (e.g. `https://mempool.space/api`).
- **`network`**: `"mainnet"` or `"testnet"`.

##### `type: "xrpl"`
- **`rpcUrl`**: Ripple WebSocket or JSON-RPC endpoint (e.g. `wss://xrplcluster.com/` or `https://s1.ripple.com:51234`).

##### `type: "venom"`
- **`rpcUrl`**: Venom JRPC / GraphQL endpoint (e.g. `https://jrpc.venom.foundation/rpc`).

##### `type: "canton"`
- **`authServerUrl`**: Canton OAuth/Auth server URL.
- **`ledgerUrl`**: Canton Ledger API endpoint.
- **`validatorUrl`**: Canton Validator API endpoint.
- **`registries`**: Array of Canton participant registry URLs.

---

### 🔧 How to Configure Blockchains for Independent Operation

To run the wallet completely independently without reliance on third-party proxies, configure the manifests to point directly to your preferred node providers:

#### 1. Setting Custom RPC Endpoints
Open the target manifest file (e.g., [`src/api/manifests/ethereum.json`](src/api/manifests/ethereum.json)) and replace `rpcUrl` with your private RPC provider or public node:
```json
"rpcUrl": "https://mainnet.infura.io/v3/YOUR_INFURA_KEY",
"scannerApiUrl": "https://api.etherscan.io/api"
```

#### 2. Adding or Modifying Default Tokens
Add any ERC-20 / SPL / TRC-20 / Jetton token to `tokens.mandatory`:
```json
{
  "address": "0xYourTokenContractAddress",
  "name": "My Custom Token",
  "symbol": "MCT",
  "decimals": 18,
  "ticker": "my-custom-token"
}
```

#### 3. Custom Token Lists (`tokens.all`)
By default, extended token lists can be loaded from any public token registry or self-hosted static JSON file conforming to `TokenManifestSchema` (e.g., Uniswap token lists or local JSON files).

---

## 🔒 Security & Privacy

- **Client-Side Cryptography:** Private keys never touch any centralized servers. Keys remain in the hardware security element or are generated and held purely in client-side ephemeral memory.
- **Encrypted Local Storage:** Sensitive persisted preferences are encrypted using AES-CBC with PBKDF2 derived keys via the standard WebCrypto API.
- **No Telemetry Tracking:** The application does not collect user tracking or telemetry metrics.

---

## 🔑 Canton Network & JWKS (`/.well-known/jwks.json`)

The file [`src/public/.well-known/jwks.json`](src/public/.well-known/jwks.json) provides a standard **JSON Web Key Set (RFC 7517)** served directly at `https://<your-domain>/.well-known/jwks.json`.

### What it contains
It exposes **public** RSA keys (`kty: "RSA"`, `alg: "RS256"`, `use: "sig"`) used for verifying JWT (JSON Web Token) digital signatures. It contains **no private keys or secrets**.

### Purpose in this project
- **Canton Network & Ledger API Authentication:** Nodes and validators in the Canton ecosystem require incoming requests to provide a signed JWT bearer token.
- **Signature Verification (JWKS Discovery):** Canton validators fetch `https://<domain>/.well-known/jwks.json` to verify that JWT tokens were signed by the authorized RSA private key matching the token's `kid` (Key ID).

### How to use or customize it
- **Default usage:** If connecting to an existing Canton network / auth server, this file is static and harmless.
- **Self-hosted Canton Validator:** If you run your own auth server and sign your own JWTs:
  1. Generate an RSA keypair:
     ```bash
     openssl genrsa -out private.pem 2048
     openssl rsa -in private.pem -pubout -out public.pem
     ```
  2. Convert your public key into JWK format and place it into `src/public/.well-known/jwks.json`.
  3. Configure your Canton validator's `jwks-url` to point to `https://<your-domain>/.well-known/jwks.json`.
- **If Canton is not used:** If your setup does not interact with Canton Network or your validator uses an external auth provider endpoint, this file is optional and can safely be removed.

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
