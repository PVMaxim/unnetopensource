export const EIP155_SIGNING_METHODS = {
  PERSONAL_SIGN: "personal_sign",
  ETH_SIGN: "eth_sign",
  ETH_SIGN_TRANSACTION: "eth_signTransaction",
  ETH_SIGN_TYPED_DATA: "eth_signTypedData",
  ETH_SIGN_TYPED_DATA_V3: "eth_signTypedData_v3",
  ETH_SIGN_TYPED_DATA_V4: "eth_signTypedData_v4",
  ETH_SEND_RAW_TRANSACTION: "eth_sendRawTransaction",
  ETH_SEND_TRANSACTION: "eth_sendTransaction",
};
export const TRON_SIGNING_METHODS = {
  TRON_SIGN_TRANSACTION: "tron_signTransaction",
}
export const EIP155_SIGNING_METHOD_NAMES = Object.values(
  EIP155_SIGNING_METHODS
);

export const SOLANA_SIGNING_METHODS = {
  SIGN_TRANSACTION: "solana_signTransaction",
}

export const EIP5792_METHODS = {
  WALLET_GET_CAPABILITIES: "wallet_getCapabilities",
  WALLET_SEND_CALLS: "wallet_sendCalls",
  WALLET_SHOW_CALLS_STATUS: "wallet_showCallsStatus",
  WALLET_GET_CALLS_STATUS: "wallet_getCallsStatus",
};
export const EIP5792_METHOD_NAMES = Object.values(EIP5792_METHODS);

export const EIP7715_METHODS = {
  WALLET_GRANT_PERMISSIONS: "wallet_grantPermissions",
};
export const EIP7715_METHOD_NAMES = Object.values(EIP7715_METHODS);

// export const TRON_SIGNING_METHODS = {
//   TRON_SIGN_TRANSACTION: 'tron_signTransaction',
//   TRON_SIGN_MESSAGE: 'tron_signMessage',
// };
// export const TRON_SIGNING_METHOD_NAMES = Object.values(TRON_SIGNING_METHODS);

export const TON_SIGNING_METHODS = {
  TON_SEND_MESSAGE: "ton_sendMessage",
  TON_SIGN_DATA: "ton_signData",
};
export const TON_SIGNING_METHOD_NAMES = Object.values(TON_SIGNING_METHODS);
