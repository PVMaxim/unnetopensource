import { SWAP_CHAINS, SWAP_SERVICES } from "../constants-types";

export const SWAP_CHAINS_NOT_NEEDING_APPROVAL: string[] = [
  SWAP_CHAINS.TON,
  SWAP_CHAINS.SOLANA,
  SWAP_CHAINS.VENOM,
  SWAP_CHAINS.XRP,
];

export const SWAP_SERVICES_EMAILS = {
  [SWAP_SERVICES.Bridgers]: "support@bridgers.xyz",
  [SWAP_SERVICES.Changelly]: "compliance@changelly.com",
  [SWAP_SERVICES.OmniBridgs]: "support@bridgers.xyz",
  [SWAP_SERVICES.Web3World]: "info@web3.world",
};

export const SWAP_ONE_INCH_CROSS_CHAIN_STEPS = {
  Approve: "Approve",
  Wrap: "Wrap",
  Confirm: "Confirm",
};
