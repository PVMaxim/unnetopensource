import { ethers } from "ethers";
import { rpcList } from '@/api/constants-types';
import { SWAP_CHAINS, SWAP_NATIVE_ADDRESS } from "../../constants-types";
import { getOwnerAddress } from "../utils/ownerAddress";
import store from "../../../store";
import { TOKENS_BALANCES_LIFETIME } from "../configs";
import { Token } from "../../common";
import { SWAP_CHAINS_NOT_NEEDING_APPROVAL } from "../constants";
import {
  CheckIsAmountIsApprovedParams,
  SwapProvider,
  SwapToken,
} from "../types";
import { createProviderManager } from "./provider";
import InputError from "./inputError";

export const getToken = (swapToken: SwapToken): Token => {
  const providerManager = createProviderManager(swapToken.chain);
  if (swapToken.address === SWAP_NATIVE_ADDRESS) {
    return providerManager.nativeCoin;
  }

  const token = providerManager.getToken(swapToken.address);
  if (!token) {
    const address =
      swapToken.chain === SWAP_CHAINS.XRP
        ? `${swapToken.currencyCode}.${swapToken.address}`
        : swapToken.address;
    if (providerManager.createToken === undefined) {
      throw new Error(
        `Provider manager for chain: ${swapToken.chain} does not support createToken method`
      );
    }
    const newToken = providerManager.createToken({
      address,
      name: swapToken.name,
      symbol: swapToken.symbol,
      decimals: swapToken.decimals,
    });

    if (!newToken) {
      throw new Error(
        `Token not found after adding metadata for address: ${swapToken.address}`
      );
    }
    return newToken;
  }
  return token;
};

export const createProviderManagerAndToken = async (
  provider: SwapProvider,
  swapToken: SwapToken
) => {
  const providerManager = createProviderManager(provider.swapChain);
  const token = getToken(swapToken);
  if (typeof token !== "object") {
    throw new Error("Token not found");
  }
  return { providerManager, token };
};

const __fetchTokenBalance = async (
  ownerAddress: string,
  swapToken: SwapToken
) => {
  const coin = getToken(swapToken);

  if (!coin) {
    throw new Error(
      `Token not found for chain: ${swapToken.chain} and address: ${swapToken.address}`
    );
  }

  if (swapToken.chain === SWAP_CHAINS.BTC) {
    return coin.getAvailableBalance(ownerAddress);
  }

  return coin.getBalance(ownerAddress);
};

export const updateAndGetTokenBalance = async (
  ownerAddress: string,
  token: SwapToken
) => {
  let balance = await __fetchTokenBalance(ownerAddress, token);
  store.dispatch("swap/setBalance", { token, balance });
};

export const getTokenBalance = async (token: SwapToken) => {
  if (!token) {
    return "0";
  }
  const provider = rpcList.find((rpc) => rpc.swapChain === token.chain);
  const ownerAddress = await getOwnerAddress(
    provider,
    store.state.user.publicKeyCard
  );

  const cacheKey = `${token.chain}-${token.address}`;
  if (
    store.state.swap.balances &&
    store.state.swap.balances[cacheKey] &&
    store.state.swap.balances[cacheKey].timestamp <
      Date.now() + TOKENS_BALANCES_LIFETIME
  ) {
    const cacheBalance = store.state.swap.balances[cacheKey].amount;
    updateAndGetTokenBalance(ownerAddress, token);
    return cacheBalance;
  }

  let balance = await __fetchTokenBalance(ownerAddress, token);

  store.dispatch("swap/setBalance", { token, ownerAddress, balance });

  return balance;
};

export const checkIsAmountIsApproved = async ({
  provider,
  keyCard,
  token,
  spenderAddress,
  amount,
}: CheckIsAmountIsApprovedParams) => {
  if (
    SWAP_CHAINS_NOT_NEEDING_APPROVAL.includes(token.chain) ||
    token.address === SWAP_NATIVE_ADDRESS ||
    spenderAddress === ""
  ) {
    return false;
  }
  const ownerAddressByProvider = await getOwnerAddress(provider, keyCard);
  const tokenContract = getToken(token);
  if (!tokenContract?.getApprovedAmount) {
    throw new Error(
      `Token contract does not support getApprovedAmount method for chain: ${token.chain} and address: ${token.address}`
    );
  }
  const approvedAmount = await tokenContract.getApprovedAmount({
    spender: spenderAddress,
    owner: ownerAddressByProvider,
  });

  return (
    ethers.toBigInt(approvedAmount.toString()) <
    ethers.parseUnits(amount.toString(), token.decimals)
  );
};

import { i18n } from "@/plugins/i18n.js";

export const checkBalance = async (value: string, token: SwapToken) => {
  const parts = value.toString().split(/[.,]/);
  if (parts.length === 2 && parts[1].length > token.decimals) {
    const message = i18n?.global?.t
      ? i18n.global.t("errors.tooManyDecimals", { decimals: token.decimals })
      : `Too many decimals (max: ${token.decimals})`;
    throw new InputError(message);
  }

  const balance = await getTokenBalance(token);
  const bgIntFromAmount = ethers.parseUnits(value.toString(), token.decimals);
  const bgIntBalance = ethers.parseUnits(balance, token.decimals);

  if (bgIntFromAmount > bgIntBalance) {
    const message = i18n?.global?.t
      ? i18n.global.t("errors.insufficientBalance", { token: token.symbol })
      : `Insufficient ${token.symbol} balance`;
    throw new InputError(message);
  }
};
