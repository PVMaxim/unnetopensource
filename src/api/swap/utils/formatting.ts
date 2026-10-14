export const formatAmount = (
  balance: string,
  precision: number = 6
): string => {
  if (balance.includes(".")) {
    const [integerPart, decimalPart] = balance.split(".");
    if (Number(decimalPart) === 0) {
      return integerPart;
    }
    const minimumBalance = 1 / 10 ** precision;
    if (Number(balance) < minimumBalance) {
      return `< ${minimumBalance.toFixed(precision)}`;
    }

    return `${integerPart}.${decimalPart.slice(0, precision)}`;
  }
  return balance;
};

export const formatApproximateAmount = (amount?: string): string => {
  if (!amount || Number(amount) === 0) {
    return "0";
  }
  return `~${formatAmount(amount, 6)}`;
};
