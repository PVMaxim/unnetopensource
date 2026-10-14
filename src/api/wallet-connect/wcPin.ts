import type { BlockchainManager, CardKeys } from "@/api/common";

let lastSuccessfulSignPin:
  | {
      pin: string;
      cardKeys: CardKeys;
    }
  | undefined = undefined;

export function storeSuccessfulSignPin(pin: string, cardKeys: CardKeys) {
  lastSuccessfulSignPin = {
    pin,
    cardKeys,
  };
}

export async function getSuccessfulSignPinByAddress(
  address: string,
  blockchainManager: BlockchainManager
): Promise<string | undefined> {
  if (!lastSuccessfulSignPin?.cardKeys) {
    return undefined;
  }

  const evaluatedAddress =
    (await blockchainManager.getWalletAddress(
      lastSuccessfulSignPin.cardKeys
    )) || "";
  return evaluatedAddress.toLowerCase() == (address || "").toLowerCase()
    ? lastSuccessfulSignPin.pin
    : undefined;
}
