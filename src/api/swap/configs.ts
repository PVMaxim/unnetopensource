import { SWAP_CHAINS, SWAP_SERVICES } from "../constants-types";
import { getRouteKey, type RoutePriorityMap } from "./utils/quote";

export const INITIAL_SLIPPAGE = 0.1; // 0.5% slippage

export const serviceDexPriorityByRoute: RoutePriorityMap = new Map([
  [getRouteKey(SWAP_CHAINS.TON, SWAP_CHAINS.TON), SWAP_SERVICES.Omniston],
]);

export const DEFAULT_ADDRESSES_BY_CHAIN = {
  [SWAP_CHAINS.VENOM]: [
    "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    "0:8a4ed4483500caf2d4bb4b56c84df41009cc3d0ed6a9de05d853e26a30faeced",
  ],
  [SWAP_CHAINS.ETH]: [
    "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  ],
  [SWAP_CHAINS.BSC]: [
    "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    "0x55d398326f99059ff775485246999027b3197955",
  ],
  [SWAP_CHAINS.SOLANA]: [
    "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  ],
  [SWAP_CHAINS.TRON]: [
    "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
  ],
  [SWAP_CHAINS.TON]: [
    "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs",
  ],
  [SWAP_CHAINS.ARBITRUM]: [
    "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
  ],
  [SWAP_CHAINS.BASE]: [
    "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
  ],
  [SWAP_CHAINS.POLYGON]: [
    "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
  ],
  [SWAP_CHAINS.AVALANCHE]: [
    "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
  ],
  [SWAP_CHAINS.XRP]: [
    "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    "rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De",
  ],
};

export const web3WorldWhiteListCurrencies = [
  "0:77d36848bb159fa485628bc38dc37eadb74befa514395e09910f601b841f749e",
  "0:74604c7a56419477d67329848d754d205f31870025a7135909e90e1726ad9a54",
  "0:8a4ed4483500caf2d4bb4b56c84df41009cc3d0ed6a9de05d853e26a30faeced",
  "0:cda5e8d5953e1a09ffeb9f62316f2994019f10abe83c8f1b0aadfbc997bd79e6",
  "0:0447c738d8549c5ea92f1c945628367db4adcc706685f760c93f8b236bf8e7e4",
  "0:4ff3c0f078889cbda817a5f5f2651824dea11a84f3857df27e76fee37d541877",
  "0:60b3ebf994515df7985cb62a9d141467edf2f869272baf507dc83d9ba2e1b199",
  "0:0a75b9ad65982b02493491b00454b34dcecb9e63700d560fc001473659297661",
  "0:e04e68f58e85ea3ce3976356c4aefaa47c983bd9394bcf2a16c2252e7c27a39e",
  "0:10d6d5c11f7ce319842b9ceb8bc9ee4d64f317cd99f1f4ce17985e7ef50e2d2d",
  "0:3558fbc02e33cd62a5c2702f9405e272c41ede875956d2179074fe25bb4d1ce8",
  "0:bbb7aa35a536b1aae92ea5e2aa8c13ee1296bbcc3a673c226f6faed51234e179",
  "0:a86d07f621365f9feacfb40d14fe536a79437e86ae2cf43886fac67c74e3db99",
  "0:a53178ec8c6fe0c62413edd9eed25508f357cfba8bf8a7dbfad9290413b2e6be",
  "0:93087892c5593648399be918ea7e73e89c911474233f5d365acb2ea991b9fa9c",
  "0:0918fe72e6a9a48b36a11b522f8823223d34c38395d9aa8422c71d0e81c4f9b5",
  "0:29a4dc828ca30da4fbd62f46d1554cbc93b4e863441eeabd8a52be2c9d56e12e",
  "0:3a26c7d83b44dcb80818898a0846411db1446071725de8d77c706f8a56ee45a8",
  "0:e6a2ced860ba3e430d9649ff8d434bd91b40a0baab53fd8c3b86ed904c5d103c",
  "0:97ef0e97978b75d66c017cb94f26c8abd9db4bb08b21c5d24a89c05ef6dd1246",
  "0:1eb224bfc43a71c2d26f79cc91c7cb30c332175aee3a7fde955298264c841054",
  "0:4bd45a17bfd91d5b8334d042635a0369a9ed6fee1dd5a3339f1835a68eb86a46",
  "0:1c5ebbde66ef5c2e7bcd49fd3d37762204d225762b03b37cac9c9fd0a5e70f0b",
];

export const TOKENS_BALANCES_LIFETIME = 1000 * 60 * 60 * 24 * 7; // 7 days
