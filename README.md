# United Wallet — Non-Custodial Multi-Chain Wallet & Swap

[![License: GPL-3.0](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)
[![Vue 3](https://img.shields.io/badge/Vue-3.5-brightgreen.svg)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-purple.svg)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![Documentation](https://img.shields.io/badge/Documentation-GitHub%20Wiki-24292e?logo=github)](https://github.com/unitednetwork-wallet/United-Network-Wallet/wiki)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Security Policy](https://img.shields.io/badge/Security-Policy-red.svg)](SECURITY.md)

A modern, high-performance non-custodial Web3 application for managing digital assets, multi-chain swaps, and hardware card authentication across major blockchain ecosystems.

> [!IMPORTANT]
> **Hardware Smart Card Required for Full Functionality**
>
> To utilize the full functionality of the wallet (hardware-level key isolation, NFC card interaction, FIDO/WebAuthn transaction signing, and PIN code management), a physical **United Network NFC Smart Card** is required.
>
> **Request Developer Card Samples:**
> To obtain test cards pre-configured with your domain name, please reach out to our team at **[info@unitednetwork.cards](mailto:info@unitednetwork.cards)**. We will ship card samples with your designated domain programmed into the secure element.

---

## Features

- **Non-Custodial by Design:** Private keys stay offline and under user control. All cryptographic signatures occur client-side.
- **NFC Hardware Card Integration:** Direct interaction with NFC security smart cards for hardware-level key isolation and transaction signing.
- **Multi-Chain Asset Management:** Native support for balances, transfers, and transaction history across:
  - **EVM Networks:** Ethereum, BNB Chain (BSC), Polygon, Arbitrum, Base, Avalanche, Katana
  - **Non-EVM Networks:** Bitcoin, Solana, TON, TRON, XRP Ledger, Venom, COTI
- **Cross-Chain & DEX Swaps:** Aggregated swaps powered by 1inch Fusion, Web3World, Changelly, Bridgers, Omniston, and more.
- **WalletConnect v2:** Connect to decentralized applications (dApps) across ecosystems via QR code or direct pairing.
- **WebCrypto Local Security:** Local storage items are encrypted client-side using WebCrypto (AES-CBC + PBKDF2).
- **Internationalization (i18n):** Multi-language interface support out of the box.

---

## Tech Stack

- **Framework:** [Vue 3](https://vuejs.org/) (Composition API, `<script setup>`)
- **State Management:** [Vuex](https://vuex.vuejs.org/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Languages:** TypeScript, JavaScript, SCSS
- **Web3 Libraries:** `ethers.js`, `@solana/web3.js`, `@ton/ton`, `tronweb`, `bitcoinjs-lib`, `xrpl`, `@1inch/cross-chain-sdk`
- **WebAssembly (WASM):** High-performance cryptography and barcode/QR scanning modules

---

## Documentation

Comprehensive guides, hardware NFC card protocols, blockchain management, and security architecture are available in the **[GitHub Wiki](https://github.com/unitednetwork-wallet/United-Network-Wallet/wiki)**:

- **[Getting Started & Developer Guide](https://github.com/unitednetwork-wallet/United-Network-Wallet/wiki/Home)**
- **[Card Interaction (FIDO & WebNFC)](https://github.com/unitednetwork-wallet/United-Network-Wallet/wiki/card-interection)**
- **[Supported Networks & Chain Management](https://github.com/unitednetwork-wallet/United-Network-Wallet/wiki/supported-networks)**
- **[Blockchain Manifest Files](https://github.com/unitednetwork-wallet/United-Network-Wallet/wiki/manifest-file)**
- **[PIN Code & Card Security](https://github.com/unitednetwork-wallet/United-Network-Wallet/wiki/pin-code)**
- **[Seed Phrases Generation & Recovery](https://github.com/unitednetwork-wallet/United-Network-Wallet/wiki/seed-phrase-generation)**
- **[Swap Overview & DEX Aggregation](https://github.com/unitednetwork-wallet/United-Network-Wallet/wiki/swap-overview)**

---

## Quick Start

### 1. Prerequisites

- **Node.js:** `v18.x` or `v20.x` (LTS recommended)
- **Package Manager:** `npm` (v9+) or `yarn`

### 2. Clone Repository

```bash
git clone https://github.com/unitednetwork-wallet/United-Network-Wallet.git
cd United-Network-Wallet
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

#### Minimum Settings Required to Run Locally Without Errors:

1. **`UNITED_CONNECT_PROJECT_ID`**: Required for WalletConnect v2 features. Register a free account at [cloud.reown.com](https://cloud.reown.com) (formerly WalletConnect Cloud) and paste your Project ID.
2. **`VITE_RPC_SOLANA`**: The official default endpoint `https://api.mainnet-beta.solana.com` restricts browser origin requests with HTTP `403 Forbidden`. To query Solana balances and tokens locally without errors, set this variable to an open public node such as `https://solana-rpc.publicnode.com` or your personal endpoint from Helius / QuickNode / Alchemy.
3. **`VITE_1INCH_API_URL`**: 1inch developer endpoints require an API token. To use 1inch cross-chain swaps, obtain a free key at [portal.1inch.dev](https://portal.1inch.dev) and route via a proxy. If you do not configure 1inch, other swap providers (Bridgers, Changelly, SWFT) and all core wallet functionalities work out of the box.

#### Complete Environment Configuration Reference:

| Variable | Required | Default Value | Description |
|---|---|---|---|
| `UNITED_CONNECT_PROJECT_ID` | **Yes** | `""` | WalletConnect / Reown Cloud Project ID for dApp pairing and transaction signing. |
| `VITE_WALLET_CONNECT_URL` | Optional | `window.location.origin` | Custom metadata origin URL passed during WalletConnect pairing sessions. |
| `VITE_COINGECKO_API_URL` | Optional | `https://api.coingecko.com` | Base URL for token prices and market valuation. |
| `VITE_1INCH_API_URL` | Optional | `https://api.1inch.dev` | Base URL for 1inch Classic and Fusion Plus swap aggregation APIs. |
| `VITE_CHANGELLY_API_URL` | Optional | `https://api.changelly.com/v2` | Base URL for Changelly cross-currency exchange JSON-RPC. |
| `VITE_BRIDGERS_API_URL` | Optional | `https://api.bridgers.xyz/api` | Base URL for Bridgers cross-chain swap protocol. |
| `VITE_TON_API_URL` | Optional | `https://tonapi.io/v2` | Base URL for TonApi indexing and account traces. |
| `VITE_OMNIBRIDGE_API_URL` | Optional | `https://www.swftc.info/api` | Base URL for SWFT AllChain Swap API. |
| `VITE_THIRD_PARTY_PROXY_URL` | Optional | `""` | Optional CORS proxy URL for third-party media and metadata. |
| `VITE_TOKEN_ICONS_CDN_URL` | Optional | `""` | Optional CDN URL prefix for custom token logos. |
| `VITE_WEBVIEW_UA` | Optional | `""` | Optional User-Agent filter string for embedded Flutter WebView container detection. |
| `VITE_RPC_*` | Optional | Defined in manifests | Optional custom JSON-RPC URLs for any network (e.g. `VITE_RPC_ETHEREUM`, `VITE_RPC_SOLANA`). |
| `VITE_SCANNER_*` | Optional | Defined in manifests | Optional custom block explorer scanner API endpoints (e.g. `VITE_SCANNER_ETHEREUM`). |

### 5. Run Local Development Server

```bash
npm run dev
```

By default, Vite starts the development server at:  
**`http://localhost:8080`**

If port `8080` is in use by another application, Vite automatically selects the next sequential available port (e.g. `http://localhost:8081`).

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts Vite local development server with HMR |
| `npm run build` | Compiles and minifies source code for production |
| `npm run preview` | Locally previews the production build |
| `npm run type-check` | Runs TypeScript compiler checks without emitting files |
| `npm run lint` | Analyzes and automatically fixes ESLint issues |

---

## Project Structure

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

## Blockchain Manifests & Network Configuration (`src/api/manifests/`)

United Wallet uses a declarative, **Manifest-Driven Architecture** to manage all supported blockchains. Instead of hardcoding node endpoints, block explorers, and asset lists inside UI components, every blockchain is completely configured via a self-contained JSON manifest in [`src/api/manifests/`](src/api/manifests/) and validated at runtime using Zod schemas in [`src/api/manifests.ts`](src/api/manifests.ts).

### Supported Chains & Manifest Mapping

| Blockchain | RPC Identifier | Manifest File | Network Type (`type`) | Default RPC / Node Endpoint |
|---|---|---|---|---|
| **Ethereum** | `ETH` | [`src/api/manifests/ethereum.json`](src/api/manifests/ethereum.json) | `evm` | `https://ethereum-rpc.publicnode.com` |
| **BNB Smart Chain** | `BSC` | [`src/api/manifests/binance.json`](src/api/manifests/binance.json) | `evm` | `https://bsc-dataseed.binance.org` |
| **Polygon** | `POLYGON` | [`src/api/manifests/polygon.json`](src/api/manifests/polygon.json) | `evm` | `https://polygon-bor-rpc.publicnode.com` |
| **Arbitrum One** | `ARBITRUM` | [`src/api/manifests/arbitrum.json`](src/api/manifests/arbitrum.json) | `evm` | `https://arb1.arbitrum.io/rpc` |
| **Base** | `BASE` | [`src/api/manifests/base.json`](src/api/manifests/base.json) | `evm` | `https://mainnet.base.org` |
| **Avalanche C-Chain** | `AVALANCHE` | [`src/api/manifests/avalanche.json`](src/api/manifests/avalanche.json) | `evm` | `https://api.avax.network/ext/bc/C/rpc` |
| **Katana** | `KATANA` | [`src/api/manifests/katana.json`](src/api/manifests/katana.json) | `evm` | `https://rpc.katana.network` |
| **Solana** | `SOLANA` | [`src/api/manifests/solana.json`](src/api/manifests/solana.json) | `solana` | `https://api.mainnet-beta.solana.com` |
| **Solana Devnet** | `SOLANA_DEVNET` | [`src/api/manifests/solana-devnet.json`](src/api/manifests/solana-devnet.json) | `solana` | `https://api.devnet.solana.com` |
| **TON Network** | `TON` | [`src/api/manifests/ton.json`](src/api/manifests/ton.json) | `ton` | `https://toncenter.com/` |
| **TRON** | `TRON` | [`src/api/manifests/tron.json`](src/api/manifests/tron.json) | `tron` | `https://api.trongrid.io` |
| **Bitcoin** | `BTC` | [`src/api/manifests/bitcoin.json`](src/api/manifests/bitcoin.json) | `bitcoin` | `https://mempool.space` |
| **Bitcoin Testnet** | `BTC_TESTNET` | [`src/api/manifests/bitcoin-testnet.json`](src/api/manifests/bitcoin-testnet.json) | `bitcoin` | `https://mempool.space/testnet/` |
| **XRP Ledger** | `XRP` | [`src/api/manifests/xrpl.json`](src/api/manifests/xrpl.json) | `xrpl` | `wss://xrplcluster.com/` |
| **Venom** | `VENOM` | [`src/api/manifests/venom.json`](src/api/manifests/venom.json) | `venom` | `https://jrpc.venom.foundation/rpc` |
| **COTI** | `COTI` | [`src/api/manifests/coti.json`](src/api/manifests/coti.json) | `coti` | `https://mainnet.coti.io/rpc` |
| **Cross-Chain Swap Assets** | — | [`src/api/manifests/swap-tokens.json`](src/api/manifests/swap-tokens.json) | Aggregated catalog | Multi-provider |

---

### Manifest JSON Structure & Schema

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
    "url": "https://api.coingecko.com"
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
    "all": "/manifests/ethereum-tokens.json"
  },
  "blockExplorer": {
    "transaction": "https://etherscan.io/tx/{id}"
  }
}
```

- **`priceProvider`**: Defines where token and coin market prices are fetched from (`type: "coingecko"`, `blockchain`: platform ID on CoinGecko, `url`: price API URL).
- **`nativeToken`**: Native currency metadata used for primary account balances and gas estimations.
- **`tokens.mandatory`**: An array of tokens automatically displayed on the main dashboard for all users.
- **`tokens.all`**: Relative path to the local token catalog JSON file (e.g. `"/manifests/ethereum-tokens.json"`) served from `public/manifests/`, or an absolute HTTP(S) URL to an external token list.
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

---

### How to Enable, Disable, or Remove a Blockchain

To add, hide, or completely remove a blockchain from the wallet UI, you do **not** need to delete complex logic or alter manager files. 

All active blockchains across the entire application (header network selector, swap routing, balance loading, and settings) are controlled centrally in **[`src/api/constants-types.ts`](src/api/constants-types.ts)** inside the **`rpcList`** array:

```typescript
// file: src/api/constants-types.ts

export const rpcList: RpcListItem[] = [
  { name: RPC_NAMES.SOLANA, type: 'solana', swapChain: SWAP_CHAINS.SOLANA, serialnumber: 1 },
  { name: RPC_NAMES.BTC, type: 'bitcoin', swapChain: SWAP_CHAINS.BTC, serialnumber: 2 },
  { name: RPC_NAMES.ETH, type: 'evm', swapChain: SWAP_CHAINS.ETH, serialnumber: 3 },
  { name: RPC_NAMES.BSC, type: 'evm', swapChain: SWAP_CHAINS.BSC, serialnumber: 4 },
  { name: RPC_NAMES.TRON, type: 'tron', swapChain: SWAP_CHAINS.TRON, serialnumber: 5 },
  { name: RPC_NAMES.TON, type: 'ton', swapChain: SWAP_CHAINS.TON, serialnumber: 6 },
  { name: RPC_NAMES.ARBITRUM, type: 'evm', swapChain: SWAP_CHAINS.ARBITRUM, serialnumber: 7 },
  { name: RPC_NAMES.BASE, type: 'evm', swapChain: SWAP_CHAINS.BASE, serialnumber: 8 },
  { name: RPC_NAMES.POLYGON, type: 'evm', swapChain: SWAP_CHAINS.POLYGON, serialnumber: 9 },
  { name: RPC_NAMES.AVALANCHE, type: 'evm', swapChain: SWAP_CHAINS.AVALANCHE, serialnumber: 10 },
  { name: RPC_NAMES.XRP, type: 'xrpl', swapChain: SWAP_CHAINS.XRP, serialnumber: 11 },

  // To disable any blockchain, simply comment out its line:
  // { name: RPC_NAMES.COTI, type: 'coti', swapChain: undefined, serialnumber: 12 },
  // { name: RPC_NAMES.KATANA, type: 'evm', swapChain: undefined, serialnumber: 13 },
  // { name: RPC_NAMES.VENOM, type: 'venom', swapChain: SWAP_CHAINS.VENOM, serialnumber: 14, displayName: "Venom (Old)" }
];
```

**Why commenting out works seamlessly:**
- The network selector in the top bar automatically filters from `rpcList`.
- The cross-chain swap engine only resolves routes for active `swapChain` entries.
- Balance polling loops only query chains present in `rpcList`.
- Zero build or TypeScript errors occur when commenting out items.

---

### How to Configure Blockchains for Independent Operation

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

## Security & Privacy

- **Client-Side Cryptography:** Private keys never touch any centralized servers. Keys remain in the hardware security element or are generated and held purely in client-side ephemeral memory.
- **Encrypted Local Storage:** Sensitive persisted preferences are encrypted using AES-CBC with PBKDF2 derived keys via the standard WebCrypto API.
- **No Telemetry Tracking:** The application does not collect user tracking or telemetry metrics.

---

## Contributing

We welcome community contributions! Please review our [Contributing Guidelines](CONTRIBUTING.md) for local development setup, coding standards, and pull request procedures.

For responsible security vulnerability disclosures, please refer to [SECURITY.md](SECURITY.md).

---

## License

This project is open-source and licensed under the [GNU General Public License v3.0 (GPLv3)](LICENSE).
