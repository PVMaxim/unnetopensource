import { CardKeys } from "@/api/common";
import { getEd25519Key } from "@/api/utils";
import { WalletContractV3R2 } from "@ton/ton";
import { storeStateInit, beginCell } from "@ton/core";
import { Buffer } from "buffer";
import { EIP155_CHAIN_NAMES, EIP155_CHAINS, SOLANA_CHAIN_NAMES, SOLANA_CHAINS, TRON_CHAIN_NAMES, TRON_CHAINS, TON_CHAIN_NAMES, TON_CHAINS } from "./wcChains";
import {
  EIP155_SIGNING_METHOD_NAMES,
  EIP5792_METHOD_NAMES,
  EIP7715_METHOD_NAMES,
  TON_SIGNING_METHOD_NAMES
} from "./wcMethods";

export const SUPPORTED_CHAINS = {
  ...EIP155_CHAINS,
  ...SOLANA_CHAINS,
  ...TRON_CHAINS,
  ...TON_CHAINS,
};

const getEip155NameSpace = async (keys: CardKeys) => {
  return {
    eip155: {
      chains: EIP155_CHAIN_NAMES,
      methods:
        EIP155_SIGNING_METHOD_NAMES.concat(EIP5792_METHOD_NAMES).concat(
          EIP7715_METHOD_NAMES
        ),
      events: ["accountsChanged", "chainChanged"],
      accounts: (
        await Promise.all(
          EIP155_CHAIN_NAMES.map(async (chainName) => {
            const manager = EIP155_CHAINS[chainName].getBlockchainManager();
            if (typeof manager == "string") {
              return "";
            }

            let address: string = "";
            try {
              address = await manager.getWalletAddress(keys);
            } catch (error) {
            }

            if (!address) {
              return "";
            }

            return `${chainName}:${address}`;
          })
        )
      ).filter((item) => !!item),
    },
  };
}

const getSolanaNameSpace = async (keys: CardKeys) => {
  return {
    solana: {
      chains: SOLANA_CHAIN_NAMES,
      methods: ["solana_signTransaction", "solana_signMessage"],
      events: [""],
      accounts: (
        await Promise.all(
          SOLANA_CHAIN_NAMES.map(async (chainName) => {
            const manager = SOLANA_CHAINS[chainName].getBlockchainManager();
            if (typeof manager == "string") {
              return "";
            }

            let address: string = "";
            try {
              address = await manager.getWalletAddress(keys);
            } catch (error) {
            }

            if (!address) {
              return "";
            }

            return `${chainName}:${address}`;
          })
        )
      ).filter((item) => !!item),
    },
  };}

  const getTronNameSpace = async (keys: CardKeys) => {
    return {
      tron: {
        chains: TRON_CHAIN_NAMES,
        methods: ["tron_signTransaction", "tron_signMessage"],
        events: [""],
        accounts: (
          await Promise.all(
            TRON_CHAIN_NAMES.map(async (chainName) => {
              const manager = TRON_CHAINS[chainName].getBlockchainManager();
              if (typeof manager == "string") {
                return "";
              }

              let address: string = "";
              try {
                address = await manager.getWalletAddress(keys);
              } catch (error) {
              }

              if (!address) {
                return "";
              }

              return `${chainName}:${address}`;
            })
          )
        ).filter((item) => !!item),
      },
    };
  };

  const getTonNameSpace = async (keys: CardKeys) => {
    return {
      ton: {
        chains: TON_CHAIN_NAMES,
        methods: TON_SIGNING_METHOD_NAMES,
        events: ["accountsChanged", "chainChanged"],
        accounts: (
          await Promise.all(
            TON_CHAIN_NAMES.map(async (chainName) => {
              const manager = TON_CHAINS[chainName].getBlockchainManager();
              if (typeof manager == "string") {
                return "";
              }

              let address: string = "";
              try {
                address = await manager.getWalletAddress(keys);
              } catch (error) {
              }

              if (!address) {
                return "";
              }

              return `${chainName}:${address}`;
            })
          )
        ).filter((item) => !!item),
      },
    };
  };

export async function getSupportedNamespaces(keys: CardKeys, chain: string): Promise<
  Record<
    string,
    {
      chains: string[];
      methods: string[];
      events: string[];
      accounts: string[];
    }
  >
> {
  if(chain === "eip155") {
    return getEip155NameSpace(keys);
  }
  else if(chain === "solana") {
    return getSolanaNameSpace(keys);
  }
  else if(chain === "tron") {
    return getTronNameSpace(keys);
  }
  else if(chain === "ton") {
    return getTonNameSpace(keys);
  }

  throw new Error(`Unsupported chain: ${chain}`);

}

export async function getTonSessionProperties(keys: CardKeys): Promise<Record<string, string>> {
  const publicKey = getEd25519Key(keys);
  const wallet = WalletContractV3R2.create({
    workchain: 0,
    publicKey: Buffer.from(publicKey, "hex"),
  });
  const stateInitCell = beginCell().store(storeStateInit(wallet.init)).endCell();
  const stateInitBoc = stateInitCell.toBoc().toString("base64");

  return {
    ton_getPublicKey: publicKey,
    ton_getStateInit: stateInitBoc,
  };
}
