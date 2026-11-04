import { clearData, getStorePrefixByKey, getTokenSymbolById, getNativeCoinId, getNativeCoinSymbol } from '@/api/ApiHandler';
import type { PublicKeyCardType } from '@/api/constants-types';
import { store } from '@/store/index.js';
import noneIcon from '@/components/svg/none.vue';
import { router } from '@/router/index.js';
import { useEventsBus } from '@/plugins/eventBus.js';
import { BigNumber } from "bignumber.js";
import { isMobileAndroidDevice, isMobileAppleDevice } from '@/plugins/checkDevice';
import { unRegisterCustomTokenStore } from '@/store/modules/dynamicCustomToken.js';
import { getTokenIcon } from '@/api/token-icons';
export { getTokenIcon };

export const isWebViewApp = (): boolean => {
  return typeof window !== 'undefined' && 'flutter_inappwebview' in window && navigator.userAgent.toLowerCase().indexOf("united.network") !== -1;
}

export const deniteAndroid201 = (): boolean => {
  return store.state.settings.cardVersion === '00000201' && isMobileAndroidDevice && !isWebViewApp();
}

export const getDefaultCardListner = (): void => {
  if (isMobileAndroidDevice) {
    store.dispatch('settings/setCardReaderPriority', 'nfc');
  }
  if (isWebViewApp()) {
    store.dispatch('settings/setCardReaderPriority', 'fido');
  }
  if (isMobileAppleDevice) {
    store.dispatch('settings/setCardReaderPriority', 'fido');
  }
}

getDefaultCardListner();

export const getNetworkIcon = (networkName: string): any => {
  if (!networkName) return noneIcon;
  const icon = getTokenIcon(networkName);
  return icon !== null ? icon : noneIcon;
};

export const getPricePercent = (sum: number | string = 0, percent: number | string = 0): BigNumber => {
  const sumBN = new BigNumber(sum);
  const percentage = new BigNumber(sum).dividedBy(100).multipliedBy(percent);
  return percentage.isNegative() ? sumBN.minus(percentage) : sumBN.plus(percentage);
};
export const getPriceMultiplie = (one: number | string = 0, two: number | string = 0): BigNumber => {
  const oneBN = new BigNumber(one);
  const twoBN = new BigNumber(two);
  return oneBN.multipliedBy(twoBN);
};

export const roundNumber = (
  str: number | string,
  val: number,
  mode: BigNumber.RoundingMode = BigNumber.ROUND_UP
): BigNumber | string => {
  const parsedNumber = new BigNumber(str);
  if (!parsedNumber.isFinite()) return '-';
  return parsedNumber.dp(val, mode);
}

export const roundNumberIntMin = (str: number | string): BigNumber | string => {
  const parsedNumber = new BigNumber(str);
  if (!parsedNumber.isFinite()) return '-';
  return parsedNumber.dp(0, BigNumber.ROUND_DOWN);
}

export const abbreviateNumber = (str: number | string, val: number = 2): string => {
  const parsedNumber = new BigNumber(str);
  if (!parsedNumber.isFinite()) return '-';
  const absNum = parsedNumber.absoluteValue();
  if (absNum.isGreaterThanOrEqualTo(1e9)) {
    return parsedNumber.dividedBy(1e9).dp(val, BigNumber.ROUND_DOWN).toString() + 'B';
  }
  if (absNum.isGreaterThanOrEqualTo(1e6)) {
    return parsedNumber.dividedBy(1e6).dp(val, BigNumber.ROUND_DOWN).toString() + 'M';
  }
  if (absNum.isGreaterThanOrEqualTo(1e3)) {
    return parsedNumber.dividedBy(1e3).dp(val, BigNumber.ROUND_DOWN).toString() + 'K';
  }
  return parsedNumber.dp(val, BigNumber.ROUND_DOWN).toString();
}

export async function wait(interval: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, interval);
  });
}

export const isTheSamePublicKey = async (key?: PublicKeyCardType | null): Promise<boolean> => {
  const currentKey = store.state.user.publicKeyCard;
  if (!currentKey?.secp256k1 && !currentKey?.ed25519) {
    return true;
  }

  const isSecpMatch =
    currentKey?.secp256k1 &&
    key?.secp256k1 &&
    currentKey.secp256k1 === key.secp256k1;
  const isEdMatch =
    currentKey?.ed25519 &&
    key?.ed25519 &&
    currentKey.ed25519 === key.ed25519;

  if (isSecpMatch || isEdMatch) {
    return true;
  } else {
    const prefix = getStorePrefixByKey(currentKey);
    unRegisterCustomTokenStore(prefix || null);
    await clearData();
    return false;
  }
}

export const isTheSamePublicKeyGuard = async (key?: PublicKeyCardType | null): Promise<boolean | void> => {
  const currentKey = store.state.user.publicKeyCard;
  if (!currentKey?.secp256k1 && !currentKey?.ed25519) {
    return true;
  }

  const isSecpMatch =
    currentKey?.secp256k1 &&
    key?.secp256k1 &&
    currentKey.secp256k1 === key.secp256k1;
  const isEdMatch =
    currentKey?.ed25519 &&
    key?.ed25519 &&
    currentKey.ed25519 === key.ed25519;

  if (isSecpMatch || isEdMatch) {
    return true;
  } else {
    await clearData();
    router.push({ name: 'authorization' });
    useEventsBus().emit('useAnotherCard', true);
    return false;
  }
}

export const getDecodedVersion = (data: string): string | null => {
  if (typeof (data) !== 'string' || data.length < 5) return null;
  return data.toString().match(/.{1,2}/g)?.map((item) => parseInt(item, 16)).join(".") ?? null;
}

export const getErrorTokenId = (err: unknown): string | null => {
  const errObj = err as Record<string, unknown> | null | undefined;
  const causeObj = errObj?.cause as Record<string, unknown> | null | undefined;
  let errorBody: Record<string, unknown> | null = null;
  try {
    errorBody = typeof causeObj?.errorBody === 'string' ? JSON.parse(causeObj.errorBody) : (causeObj?.errorBody as Record<string, unknown> | null);
  } catch (_e) {
    errorBody = causeObj?.errorBody as Record<string, unknown> | null;
  }

  if (errObj?.tokenId !== null && errObj?.tokenId !== undefined) {
    return String(errObj.tokenId);
  }
  if (errorBody?.tokenId !== null && errorBody?.tokenId !== undefined) {
    return String(errorBody.tokenId);
  }
  if (typeof errObj?.message === 'string') {
    const match = errObj.message.match(/tokenId=([^\s,]+)/);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

import { i18n } from '../plugins/i18n.js';

export const getErrorMessage = async (err: any, moduleName: string | null = null): Promise<{ title: string | null, message: string | null }> => {
  const t = i18n.global.t;

  if (!err) return { title: null, message: null };

  const errObj = err as Record<string, unknown>;
  const causeObj = errObj?.cause as Record<string, unknown> | null | undefined;

  let errorBody: any = null;
  try {
    errorBody = typeof causeObj?.errorBody === 'string' ? JSON.parse(causeObj.errorBody) : causeObj?.errorBody;
  } catch (_e) {
    errorBody = causeObj?.errorBody;
  }
  if (!errorBody && errObj?.code) {
    errorBody = err;
  }

  const errBodyObj = errorBody as Record<string, unknown> | null | undefined;
  const errMessage = typeof errObj?.message === 'string'
    ? errObj.message
    : (typeof causeObj?.errorSubtitle === 'string' ? causeObj.errorSubtitle : '');

  const errTitle = typeof errObj?.message === 'string' ? errObj.message : null;
  const errSubtitle = typeof causeObj?.errorSubtitle === 'string' ? causeObj.errorSubtitle : null;

  switch (true) {
    case errorBody?.toString() === '1' || errorBody?.code?.toString() === '1' || errorBody?.errorCode?.toString() === '1':
      store.dispatch('user/resetPinHash');
      if (moduleName === 'changePinCode') {
        return { title: errTitle, message: t('errors.oldPinIncorrect') };
      }
      return { title: errTitle, message: t('errors.wrongPin') };
    case errorBody?.toString() === '2' || errorBody?.code?.toString() === '2' || errorBody?.errorCode?.toString() === '2':
      return { title: errTitle, message: t('errors.cardBlocked') };
    case errorBody?.toString() === '4' || errorBody?.code?.toString() === '4' || errorBody?.errorCode?.toString() === '4':
      return { title: errTitle, message: t('errors.networkError') };
    case errorBody === 'Error: Low balance of native coins':
      return { title: errTitle, message: t('errors.lowNativeBalance') };
    case errorBody === 'Error: Low token balance':
      return { title: errTitle, message: t('errors.lowTokenBalance') };
    case errorBody?.code === 'INSUFFICIENT_FUNDS' || errorBody?.code === 'LOW_BALANCE' || errObj?.code === 'LOW_BALANCE' || errObj?.code === 'INSUFFICIENT_FUNDS' || (typeof errMessage === 'string' && (errMessage.includes('Low balance') || errMessage.toLowerCase().includes('insufficient balance') || errMessage.toLowerCase().includes('is not enough balance'))): {
      const tokenId = getErrorTokenId(err);
      const nativeCoinId = await getNativeCoinId();
      const tokenName = (tokenId && tokenId !== '_' && tokenId !== nativeCoinId)
        ? ((await getTokenSymbolById(tokenId)) || tokenId)
        : (await getNativeCoinSymbol());
      const isGas = !tokenId || tokenId === '_' || tokenId === nativeCoinId || (typeof errMessage === 'string' && (errMessage.toLowerCase().includes('gas') || errMessage.toLowerCase().includes('fee')));
      const amountError = isGas
        ? t('errors.insufficientBalanceForGas', { token: tokenName })
        : t('errors.insufficientBalance', { token: tokenName });
      return { title: t('errors.balanceError'), message: amountError };
    }
    case errBodyObj?.code === 'AMOUNT_TOO_SMALL' || errBodyObj?.code === 'NUMERIC_FAULT' || errObj?.code === 'AMOUNT_TOO_SMALL': {
      const minAmount = String(errBodyObj?.minAmount ?? errObj?.minAmount ?? '');
      return { title: t('errors.amountTooSmall', { amount: '' }), message: t('errors.amountTooSmall', { amount: minAmount ? t('errors.minimalAmountIs') + ' ' + minAmount : '' }) };
    }
    case errBodyObj?.code === 'TOO_MANY_DECIMALS' || errObj?.code === 'TOO_MANY_DECIMALS': {
      const maxDecimals = String(errBodyObj?.maxDecimals ?? errObj?.maxDecimals ?? '');
      return { title: t('errors.tooManyDecimals', { decimals: '' }), message: t('errors.tooManyDecimals', { decimals: maxDecimals ? t('errors.minimalDecimalsIs') + ' ' + maxDecimals : '' }) };
    }
    case errBodyObj?.code === 'LOW_DST_LIMIT':
      return { title: errTitle, message: t('errors.lowDstLimit') };
    case errBodyObj?.code === 'SAME_SENDER_AND_RECIPIENT':
      return { title: errTitle, message: t('errors.sameSenderRecipient') };
    case errorBody === 'Error: Wallet already deployed':
      return { title: errTitle, message: t('errors.walletAlreadyDeployed') };
    case errorBody === 'Error: Internal error':
      return { title: errTitle, message: t('errors.internalError') };
    case errorBody === 'Error: Invalid card response':
      return { title: errTitle, message: t('errors.invalidCardResponse') };
    case errorBody === 'Error: Invalid argument':
      return { title: errTitle, message: t('errors.invalidArgument') };
    case errorBody === 'Error: Card wallet is not deployed':
      return { title: errTitle, message: t('errors.walletNotDeployed') };
    case errorBody === 'Error: Public key mismatch':
      return { title: errTitle, message: t('errors.publicKeyMismatch') };
    case (String(errBodyObj?.code) === 'INVALID_ARGUMENT' && String(errBodyObj?.message) === 'No ioPublicKey'):
      return { title: errTitle, message: t('errors.noIoPublicKey') };
    case typeof errMessage === 'string' && (errMessage.includes('504') || errMessage.includes('502') || errMessage.includes('503') || errMessage.toLowerCase().includes('gateway time-out') || errMessage.toLowerCase().includes('gateway timeout') || errMessage.toLowerCase().includes('failed to fetch')):
      return { title: t('errors.networkError'), message: t('pages.send.pressOkToTryAgain') };
    default: {
      const isHtml = (str: string | null) => typeof str === 'string' && /<[a-z][\s\S]*>/i.test(str);
      const safeTitle = isHtml(errTitle) ? t('errors.networkError') : errTitle;
      const safeSubtitle = isHtml(errSubtitle) ? t('pages.send.pressOkToTryAgain') : errSubtitle;
      if (!causeObj?.errorBody && !causeObj?.errorSubtitle) {
        return { title: safeTitle || t('errors.internalError'), message: safeTitle ? t('pages.send.pressOkToTryAgain') : null };
      }
      return { title: safeTitle, message: safeSubtitle };
    }
  }
}

export async function copyToClipboard(str: string) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(str);
      return true;
    } catch (e) {
    }
  }

  const textArea = document.createElement("textarea");
  textArea.value = str;
  textArea.style.position = "fixed";
  textArea.style.top = "-9999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(textArea);
  }
}

export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}