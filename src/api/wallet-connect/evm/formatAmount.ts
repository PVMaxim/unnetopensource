import { BigNumber } from 'bignumber.js';

const MIN_AMOUNT = 0.000001;
const DEFAULT_PRECISION = 6;

const MAX_SIGNIFICANT_DECIMAL_PLACES = 3;

const ZERO_DISPLAY = '0';

function formatAmountMaxPrecision(
  locale: string,
  num: number | BigNumber,
): string {
  const bigNumberValue = new BigNumber(num);
  const numberOfDecimals = bigNumberValue.decimalPlaces() || 0;
  const formattedValue = bigNumberValue.toFixed(numberOfDecimals);

  const [integerPart, fractionalPart] = formattedValue.split('.');
  const formattedIntegerPart = new Intl.NumberFormat(locale).format(
    integerPart as unknown as number,
  );

  return fractionalPart
    ? `${formattedIntegerPart}.${fractionalPart}`
    : formattedIntegerPart;
}

export function formatAmount(locale: string, amountStr: string): string {
  const amount = new BigNumber(amountStr);
  if (amount.isZero()) {
    return ZERO_DISPLAY;
  }

  if (amount.abs().isLessThan(MIN_AMOUNT)) {
    return `<${formatAmountMaxPrecision(locale, MIN_AMOUNT)}`;
  }

  if (amount.abs().isLessThan(1)) {
    return new Intl.NumberFormat(locale, {
      maximumSignificantDigits: MAX_SIGNIFICANT_DECIMAL_PLACES,
    } as Intl.NumberFormatOptions).format(
      Number(amount.toPrecision(DEFAULT_PRECISION)),
    );
  }

  const digitsLeftOfDecimal = amount.abs().integerValue().toString().length;
  const maximumFractionDigits = Math.max(
    0,
    MAX_SIGNIFICANT_DECIMAL_PLACES - digitsLeftOfDecimal + 1,
  );

  return new Intl.NumberFormat(locale, {
    maximumFractionDigits,
  } as Intl.NumberFormatOptions).format(
    amount.toFixed(maximumFractionDigits) as unknown as number,
  );
}
