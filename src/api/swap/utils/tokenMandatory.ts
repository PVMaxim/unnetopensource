import { SWAP_CHAINS } from "../../constants-types";
import { TokenSchema } from "../../manifests";
import { SwapChain } from "../types";
import venomManifest from "../../manifests/venom.json";
import tronManifest from "../../manifests/tron.json";
import ethereumManifest from "../../manifests/ethereum.json";
import binanceManifest from "../../manifests/binance.json";
import tonManifest from "../../manifests/ton.json";
import solanaManifest from "../../manifests/solana.json";
import arbitrumManifest from "../../manifests/arbitrum.json";
import avalancheManifest from "../../manifests/avalanche.json";
import baseManifest from "../../manifests/base.json";
import polygonManifest from "../../manifests/polygon.json";
import xrplManifest from "../../manifests/xrpl.json";

import { z } from "zod";

type Token = z.infer<typeof TokenSchema>;

export const getTokenMandatoryByChain = (chain: SwapChain): Token[] => {
  switch (chain) {
    case SWAP_CHAINS.VENOM:
      return venomManifest.tokens.mandatory;
    case SWAP_CHAINS.TRON:
      return tronManifest.tokens.mandatory;
    case SWAP_CHAINS.ETH:
      return ethereumManifest.tokens.mandatory;
    case SWAP_CHAINS.BSC:
      return binanceManifest.tokens.mandatory;
    case SWAP_CHAINS.TON:
      return tonManifest.tokens.mandatory;
    case SWAP_CHAINS.SOLANA:
      return solanaManifest.tokens.mandatory;
    case SWAP_CHAINS.ARBITRUM:
      return arbitrumManifest.tokens.mandatory;
    case SWAP_CHAINS.AVALANCHE:
      return avalancheManifest.tokens.mandatory;
    case SWAP_CHAINS.BASE:
      return baseManifest.tokens.mandatory;
    case SWAP_CHAINS.POLYGON:
      return polygonManifest.tokens.mandatory;
    case SWAP_CHAINS.XRP:
      return xrplManifest.tokens.mandatory;

    default:
      return [];
  }
};
