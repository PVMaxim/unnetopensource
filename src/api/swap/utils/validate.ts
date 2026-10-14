import { PublicKey } from "@solana/web3.js";
import { Address } from "@ton/core";
export const validateSwapInput = (value: string): boolean => {
  return (
    value === "" ||
    (/^(?:\d+([.,]\d*)?)?$/.test(value) &&
      parseFloat(value.replace(",", ".")) >= 0)
  );
};

export const normaliseValue = (value: string): string => {
  return value.replace(",", ".");
};

export const isValidSolanaAddress = (address: string) => {
  try {
    new PublicKey(address);
    return true;
  } catch (error) {
    return false;
  }
};

export const isValidVenomAddress = (address: string) => {
  if (!address) return false;
  const venomAddressRegex = /^(0|-1):[a-f0-9]{64}$/i;
  return venomAddressRegex.test(address);
};

export const isTonAddress = (address: string) => {
  try {
    Address.parse(address);
    return true;
  } catch {
    return false;
  }
};
