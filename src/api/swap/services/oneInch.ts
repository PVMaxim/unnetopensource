import BigNumber from "bignumber.js";
import { CardKeys, Request } from "../../common";
import { SWAP_CHAINS, SWAP_NATIVE_ADDRESS } from "../../constants-types";

import { SwapChain, SwapProvider, SwapToken } from "../types";
import { SwapService } from "./swap";
import tokens from "../../manifests/swap-tokens.json";
import {
  checkIsAmountIsApproved,
  createProviderManagerAndToken,
} from "../utils/tokenBalances";
import {
  MessageTypes,
  SignTypedDataVersion,
  TypedDataUtils,
  TypedMessage,
} from "@metamask/eth-sig-util";
import { EIP712TypedData } from "@1inch/fusion-sdk";
import { ONE_INCH_CHAIN_IDS, getChainByEvmId, getExplorerTxUrl } from "../chainConfig";

const WRAPPED_TOKENS: Record<string, string> = {
  [SWAP_CHAINS.ETH]: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
  [SWAP_CHAINS.ARBITRUM]: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
  [SWAP_CHAINS.AVALANCHE]: "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7",
  [SWAP_CHAINS.BSC]: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
  [SWAP_CHAINS.POLYGON]: "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
  [SWAP_CHAINS.BASE]: "0x4200000000000000000000000000000000000006",
};

const SOL_NATIVE_TOKEN_ADDRESS = "SoNative11111111111111111111111111111111111";

const AGGREGATION_ROUTER_V6 = "0x111111125421ca6dc452d289314280a0f8842a65";
export class OneInch extends SwapService {
  aggregateAddress: string = AGGREGATION_ROUTER_V6;
  constructor(supportedProviders: string[]) {
    super(supportedProviders);
  }

  getChainId(chain: SwapChain | string): number {
    return ONE_INCH_CHAIN_IDS[chain as SwapChain];
  }

  getWrappedTokenByChain(chain: SwapChain | string): SwapToken {
    const wrappedTokenAddress = WRAPPED_TOKENS[chain];
    if (!wrappedTokenAddress) {
      throw new Error(`Wrapped token not found for chain: ${chain}`);
    }
    const wrappedToken = tokens.find(
      (token) =>
        token.address.toLowerCase() === wrappedTokenAddress.toLowerCase()
    );
    if (!wrappedToken) {
      throw new Error(`Wrapped token details not found for chain: ${chain}`);
    }
    return wrappedToken;
  }

  normalizeFromTokenAddress(token: SwapToken): string {
    const { chain, address } = token;

    if (chain === SWAP_CHAINS.SOLANA && address === SWAP_NATIVE_ADDRESS) {
      return SOL_NATIVE_TOKEN_ADDRESS;
    }

    if (chain !== SWAP_CHAINS.SOLANA && address === SWAP_NATIVE_ADDRESS) {
      return WRAPPED_TOKENS[chain];
    }

    return address;
  }

  normalizeToTokenAddress(token: SwapToken): string {
    const { chain, address } = token;

    if (chain === SWAP_CHAINS.SOLANA && address === SWAP_NATIVE_ADDRESS) {
      return SOL_NATIVE_TOKEN_ADDRESS;
    }

    return address;
  }

  checkIsNeedWrap(token: SwapToken): Boolean {
    return token.address === SWAP_NATIVE_ADDRESS;
  }

  getWrapData(token: SwapToken, amount: string) {
    const wrappedNativeToken = this.getWrappedTokenByChain(token.chain);
    return {
      fromToken: token,
      toToken: wrappedNativeToken,
      amount: new BigNumber(amount)
        .shiftedBy(-wrappedNativeToken?.decimals)
        .toFixed(),
    };
  }

  async checkApprove(
    token: SwapToken,
    keyCard: string,
    amount: string,
    provider: SwapProvider
  ): Promise<Boolean> {
    const aggregatorAddress = AGGREGATION_ROUTER_V6;

    if (token.address === SWAP_NATIVE_ADDRESS) {
      const wrappedNativeToken = this.getWrappedTokenByChain(token.chain);
      return checkIsAmountIsApproved({
        provider,
        keyCard,
        token: wrappedNativeToken,
        spenderAddress: aggregatorAddress,
        amount: new BigNumber(amount).shiftedBy(-token?.decimals).toFixed(),
      });
    }

    return checkIsAmountIsApproved({
      provider,
      keyCard,
      token,
      spenderAddress: aggregatorAddress,
      amount: new BigNumber(amount).shiftedBy(-token?.decimals).toFixed(),
    });
  }

  async wrapToken(
    provider: SwapProvider,
    wrapToken: SwapToken,
    amount: string,
    keyCard: CardKeys
  ): Promise<Request> {
    const { token } = await createProviderManagerAndToken(provider, wrapToken);
    if (!token.wrap) {
      throw new Error("wrap not implemented");
    }

    const tx = await token.wrap({
      amount,
      keys: keyCard,
    });
    return tx;
  }
  convertTypedDataToHash(
    typedData: EIP712TypedData | TypedMessage<MessageTypes>
  ): string {
    const buffer = TypedDataUtils.eip712Hash(
      typedData as any,
      SignTypedDataVersion.V4
    );

    return buffer.toString("hex");
  }
  async approveToken(
    provider: SwapProvider,
    swapToken: SwapToken,
    amount: string,
    keyCard: CardKeys
  ): Promise<Request> {
    const { token } = await createProviderManagerAndToken(provider, swapToken);
    if (!token.approve) {
      throw new Error("approve not implemented");
    }
    const aggregatorAddress = AGGREGATION_ROUTER_V6;
    const tx = await token.approve({
      spender: aggregatorAddress,
      amount: new BigNumber(amount).shiftedBy(-swapToken?.decimals).toFixed(),
      keys: keyCard,
    });
    return tx;
  }

  getSwapChainById(chainId: number): SwapChain {
    return (getChainByEvmId(chainId) ?? "") as SwapChain;
  }

  checkSolanaNativeAddress(address: string): string {
    if (address === SOL_NATIVE_TOKEN_ADDRESS) {
      return SWAP_NATIVE_ADDRESS;
    }
    return address;
  }

  getScanLinkByChain(chain?: string, txHash?: string): string {
    return getExplorerTxUrl(chain ?? "", txHash ?? "");
  }

  getEvmChainIds(): number[] {
    return Object.entries(ONE_INCH_CHAIN_IDS)
      .filter(([chain]) => chain !== SWAP_CHAINS.SOLANA)
      .map(([, id]) => id);
  }

  getSolanaChainId(): number {
    return ONE_INCH_CHAIN_IDS[SWAP_CHAINS.SOLANA];
  }
}
