import { BlockchainManager, CardKeys } from "@/api/common";
import { store } from "@/store";
import { isWalletConnectDebugMode } from "./wcDebug";

export function getCardKeys(): CardKeys {
  return isWalletConnectDebugMode()
    ? {
        secp256k1:
          "0x04d78c96631255467c35f7550ca1aa995c730f78729880a1528430c294bbd8a33f431a56a4425bd25a69f71327d79b5e01c91e34c13d87514f58c41c73cecd80e8",
        ed25519: "some",
      }
    : store.state.user.publicKeyCard;
}

export function checkCardKeys(cardKeys?: CardKeys): boolean {
  return (
    !!cardKeys?.ed25519 &&
    cardKeys.ed25519 !=
      "0000000000000000000000000000000000000000000000000000000000000000"
  );
}

export async function checkIsCurrentAccountAddress(
  address: string,
  manager: BlockchainManager
): Promise<boolean> {
  if (!address || !manager) {
    return false;
  }

  const cardKeys = getCardKeys();
  if (!checkCardKeys(cardKeys)) {
    return false;
  }

  try {
    const signedIn = await manager.getWalletAddress(cardKeys);
    return signedIn.toLowerCase() == address.toLowerCase();
  } catch (error) {
    return false;
  }
}
