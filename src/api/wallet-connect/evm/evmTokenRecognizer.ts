import { EvmErc20Token } from "@/api/evm/erc20-token";
import { EvmBlockchain } from "./evmBlockchain";
import { ZeroAddress } from "ethers";

export interface EvmTokenRecognized {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  iconUrl: string;
}

export type EvmTokenRecognizedRef = EvmTokenRecognized | undefined;

class EvmTokenRecognizer {
  private cache: {
    [decimalChainId: string]: { [address: string]: EvmTokenRecognized };
  } = {};

  async recognize(address: string, blockchain: EvmBlockchain): Promise<EvmTokenRecognized | undefined> {
    const decimalChainId = blockchain.chainId.asDecimalString();
    const normalizedAddress = address.toLowerCase();

    if (!this.cache[decimalChainId]) {
      this.cache[decimalChainId] = {};
    }

    const cachedToken = this.cache[decimalChainId][normalizedAddress];
    if (cachedToken) {
      return cachedToken;
    }

    try {

      if (
        await EvmErc20Token.checkTokenOnChain({
          provider: blockchain.manager.provider,
          address,
        })
      ) {
        let token = blockchain.manager.getToken(address);
        if (!token) {
          blockchain.manager.addTokenByMetadata({ address });
          token = blockchain.manager.getToken(address);
          if (!token) {
            throw new Error(`Token not found after adding metadata for address: ${address}`);
          }
        }

        const recognizedToken: EvmTokenRecognized = {
          address,
          name: await token.getName(),
          symbol: await token.getSymbol(),
          decimals: await token.getDecimals(),
          iconUrl: `https://static.cx.metamask.io/api/v1/tokenIcons/${decimalChainId}/${address.toLowerCase()}.png`,
        };

        this.cache[decimalChainId][normalizedAddress] = recognizedToken;
        return recognizedToken;
      } else {
        const native = blockchain.manager.nativeCoin;
        const recognizedToken: EvmTokenRecognized = {
          address,
          name: await native.getName(),
          symbol: await native.getSymbol(),
          decimals: await native.getDecimals(),
          iconUrl: `https://static.cx.metamask.io/api/v1/tokenIcons/${decimalChainId}/${ZeroAddress}.png`,
        };
        this.cache[decimalChainId][ZeroAddress] = recognizedToken;
        return recognizedToken;
      }
    } catch (error) {
      console.error('token recognition error', error);
      return undefined;
    }
  }

  notRecognized(): undefined {
    return undefined;
  }

  nativeCoinPseudoAddress() {
    return ZeroAddress;
  }
}

export const evmTokenRecognizer = new EvmTokenRecognizer();
