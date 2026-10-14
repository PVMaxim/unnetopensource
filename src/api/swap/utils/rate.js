import BigNumber from "bignumber.js";
import { formatUnits, parseUnits, toBigInt } from "ethers";
import InputError from "./inputError";

export const calculateRate = async ({
  fromAmount,
  fromDecimal,
  toAmount,
  toDecimal,
}) => {
  try {
    if ((toAmount && parseInt(toAmount) === 0) || !fromAmount) {
      return { rate: 0, reverseRate: 0 };
    }
    const bgFromAmount = toBigInt(fromAmount); // From token is already in base units
    const bgToAmount = toBigInt(toAmount);
    const rate =
      (bgToAmount * toBigInt((10 ** fromDecimal).toString())) / bgFromAmount;
    const reverseRate =
      (bgFromAmount * toBigInt((10 ** toDecimal).toString())) / bgToAmount;

    return {
      rate: formatUnits(rate, toDecimal),
      reverseRate: formatUnits(reverseRate, fromDecimal),
    };
  } catch (error) {
    console.error("Error calculating rate:", error);
    throw error;
  }
};

export const calculateComission = (fee, amount) => {
  const feeBig = new BigNumber(fee).multipliedBy(new BigNumber(10).pow(18));
  const amountBig = new BigNumber(amount).multipliedBy(
    new BigNumber(10).pow(18)
  );
  const commissionBg = feeBig
    .multipliedBy(amountBig)
    .dividedBy(new BigNumber(10).pow(18));
  const res1 = commissionBg.dividedBy(new BigNumber(10).pow(18)).toString();

  return res1;
};

function roundUp(num, decimals = 6) {
  const factor = 10 ** decimals;
  return Math.ceil(parseFloat(num) * factor) / factor;
}

export const checkIsBetweenMinMax = (value, min, max, token) => {
  if (parseFloat(min) < 0) {
    throw new InputError("The amount is to small");
  }
  const bgIntFromAmount = parseUnits(value.toString(), token.decimals);
  const bgIntMinDeposit = parseUnits(
    parseFloat(min).toFixed(token.decimals),
    token.decimals
  );
  const bgIntMaxDeposit = parseUnits(
    parseFloat(max).toFixed(token.decimals),
    token.decimals
  );

  if (bgIntFromAmount > bgIntMaxDeposit) {
    const maxStr = parseFloat(max) > 1 ? roundUp(max, 2) : roundUp(max);
    throw new InputError(
      `The maximum deposit amount is ${maxStr} ${token.symbol}`
    );
  }

  if (bgIntFromAmount < bgIntMinDeposit) {
    const minStr = parseFloat(min) > 1 ? roundUp(min, 2) : roundUp(min);
    throw new InputError(
      `The minimum deposit amount is ${minStr} ${token.symbol}`
    );
  }
};
