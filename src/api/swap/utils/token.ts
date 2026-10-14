import { BigNumber } from "bignumber.js";
import { Token } from "../../common";
import { SWAP_CHAINS, SWAP_NATIVE_ADDRESS } from "../../constants-types";
import { SwapProvider, SwapToken } from "../types";
import { getOwnerAddress } from "./ownerAddress";
import { createProviderManager } from "./provider";

import InputError from "./inputError";
import { i18n } from "@/plugins/i18n.js";

export const checkBalanceForFee = async ({
  swapProvider,
  feeAmount,
  publicKey,
  nativeTokenAmount = "0",
}: {
  swapProvider: SwapProvider;
  nativeTokenAmount?: string;
  feeAmount: string;
  publicKey: string;
}) => {
  let reserveAmount = 0;
  const ownerAddress = await getOwnerAddress(swapProvider, publicKey);
  const provider = createProviderManager(swapProvider.swapChain);
  const nativeToken = provider.nativeCoin;
  if (swapProvider.swapChain === SWAP_CHAINS.XRP) {
    if (typeof (nativeToken as any).getReserveAmount === "function") {
      reserveAmount = await (nativeToken as any).getReserveAmount(ownerAddress);
    }
  }
  const nativeTokenBalance = await nativeToken.getBalance(ownerAddress);
  const isEnough = new BigNumber(nativeTokenBalance)
    .minus(reserveAmount)
    .gte(new BigNumber(feeAmount).plus(new BigNumber(nativeTokenAmount)));
  if (!isEnough) {
    const nativeTokenSymbol = await nativeToken.getSymbol();
    const t = i18n?.global?.t;
    let errorMessage = "";
    if (t) {
      errorMessage = t("errors.insufficientBalanceForGas", { token: nativeTokenSymbol });
    } else {
      if (nativeTokenAmount !== "0" && reserveAmount > 0) {
        errorMessage = `Is not enough balance to swap ${nativeTokenAmount} ${nativeTokenSymbol} and fee ${feeAmount} ${nativeTokenSymbol} with reserve ${reserveAmount} ${nativeTokenSymbol}`;
      } else if (nativeTokenAmount !== "0") {
        errorMessage = `Is not enough balance to swap ${nativeTokenAmount} ${nativeTokenSymbol} and fee ${feeAmount} ${nativeTokenSymbol}`;
      } else {
        errorMessage = `Is not enough balance for gas fee ${feeAmount} ${nativeTokenSymbol}`;
      }
    }

    throw new InputError(errorMessage);
  }
};
