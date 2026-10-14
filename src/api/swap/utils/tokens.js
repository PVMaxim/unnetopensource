import { getStorePrefix, setTokenBalance } from "../../ApiHandler";
import { SWAP_CHAINS, SWAP_NATIVE_ADDRESS, rpcList } from "../../constants-types";
import { createProviderManager } from "./provider";
import { store } from "@/store/index";
import { getTokenMandatoryByChain } from "./tokenMandatory";

export const sortTokensByChainIds = (tokens) => {
  const sortedTokens = {};
  Object.keys(SWAP_CHAINS).forEach((chain) => {
    sortedTokens[chain] = [];
  });
  tokens.forEach((token) => {
    if (sortedTokens[token.chain]) {
      sortedTokens[token.chain].push(token);
    }
  });

  return sortedTokens;
};

export const sortTokensByProviderTokens = (tokens) => {
  let sortedTokens = {};
  Object.keys(tokens).forEach((chain) => {
    const provider = createProviderManager(chain);
    const providerTokens = provider
      .getTokens()
      .map((token) => token.getAddress());

    const priorityMap = new Map(
      providerTokens.map((token, index) => [token.toLowerCase(), index])
    );
    const sortedChaintTokens = tokens[chain]
      .slice()
      .sort((a, b) => {
        const aIndex = priorityMap.has(a.address.toLowerCase())
          ? priorityMap.get(a.address.toLowerCase())
          : Infinity;
        const bIndex = priorityMap.has(b.address.toLowerCase())
          ? priorityMap.get(b.address.toLowerCase())
          : Infinity;
        return aIndex - bIndex;
      })
      .map((token) => {
        return {
          ...token,
          isUsersToken: priorityMap.has(token.address.toLowerCase()),
        };
      });
    sortedTokens[chain] = sortedChaintTokens;
  });
  return sortedTokens;
};

export const checkAndAddUserToken = async (token) => {
  if (token.address === SWAP_NATIVE_ADDRESS) {
    return;
  }
  const tokenAddress = token?.currencyCode
    ? `${token.currencyCode}.${token.address}`
    : token.address;
  const whiteListTokens = getTokenMandatoryByChain(token.chain);
  const isExistInWhiteList = whiteListTokens.some(
    (whiteListToken) =>
      whiteListToken.address.toLowerCase() === tokenAddress.toLowerCase()
  );
  if (isExistInWhiteList) {
    return;
  }
  const rpc = rpcList.find((rpc) => rpc.swapChain === token.chain);
  if (!rpc) return;
  const prefixStore = getStorePrefix();
  if (!prefixStore) return;
  const customTokens =
    store.state[`${prefixStore}.customtoken`]?.customToken?.[rpc.name] || [];
  const isExistInCustomTokens = Array.isArray(customTokens) && customTokens.some(
    (customToken) => customToken?.toLowerCase() === tokenAddress?.toLowerCase()
  );
  if (isExistInCustomTokens) {
    return;
  }

  const arrayCopy = Array.isArray(customTokens) ? [...customTokens, tokenAddress] : [tokenAddress];
  store
    .dispatch(`${prefixStore}.customtoken/setCustomToken`, {
      key: rpc?.name,
      value: arrayCopy,
    })
    .catch((error) => {
      console.log("setCustomToken error : " + JSON.stringify(error));
    });
  setTokenBalance(tokenAddress, rpc.name);
};
