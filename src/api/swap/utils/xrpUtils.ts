import { BigNumber } from "bignumber.js";
import { SWAP_CHAINS, SWAP_NATIVE_ADDRESS } from "../../constants-types";
import { SwapProvider, SwapToken } from "../types";
import { getOwnerAddress } from "./ownerAddress";
import { createProviderManagerAndToken } from "./tokenBalances";
export const checkIsNeedIncreaseTrustLimitXrp = async (
  provider: SwapProvider,
  token: SwapToken,
  amount: string,
  publicKey: string
): Promise<Boolean> => {
  if(provider.swapChain !== SWAP_CHAINS.XRP) {
    return false;
  }

  if(token.address === SWAP_NATIVE_ADDRESS) {
    return false;
  }
  
  const { token: xrpToken } = await createProviderManagerAndToken(
    provider,
    token
  );
  const xrpOwnerAddress = await getOwnerAddress(provider, publicKey);
  const trustedLimit =
    xrpToken && typeof (xrpToken as any).getTrustLimit === "function"
      ? await (xrpToken as any).getTrustLimit(xrpOwnerAddress)
      : "0";
  return new BigNumber(amount).gt(new BigNumber(trustedLimit || 0));
  
};
