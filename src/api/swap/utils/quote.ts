import { SWAP_SERVICES } from "../../constants-types";
import { QuoteResponse } from "../types";

export const getRouteKey = (fromChain: string, toChain: string): string =>
  `${fromChain}|${toChain}`;

export type RoutePriorityMap = Map<string, string>;

export type ChooseQuoteOptions = {
  fromChain: string;
  toChain: string;
  priorityByRoute?: RoutePriorityMap;
};

const hasValidOutput = (quote: QuoteResponse): boolean =>
  Number(quote.txData?.toTokenAmount ?? 0) > 0;

const preferServiceIfValid = (
  quotes: QuoteResponse[],
  serviceDex: string,
): QuoteResponse | null => {
  const quote = quotes.find((q) => q.txData.dex === serviceDex);
  return quote && hasValidOutput(quote) ? quote : null;
};

const hasLowerDepositMin = (
  current: QuoteResponse,
  selected: QuoteResponse,
): boolean => {
  const a = current.txData.depositMin;
  const b = selected.txData.depositMin;
  if (a === undefined || b === undefined) return false;
  return Number(a) < Number(b);
};

const quoteWithMinimalDeposit = (quotes: QuoteResponse[]): QuoteResponse =>
  quotes.reduce((selected, current) =>
    hasLowerDepositMin(current, selected) ? current : selected,
  );

const quoteWithBestOutput = (
  quotes: QuoteResponse[],
  fallback: QuoteResponse,
): QuoteResponse =>
  quotes.reduce(
    (best, current) =>
      Number(current.txData.toTokenAmount) > Number(best.txData.toTokenAmount)
        ? current
        : best,
    fallback,
  );

const getPreferredServiceForRoute = (
  options?: ChooseQuoteOptions,
): string | undefined => {
  if (!options) return SWAP_SERVICES.Bridgers;
  if (options.priorityByRoute == null) return SWAP_SERVICES.Bridgers;
  const key = getRouteKey(options.fromChain, options.toChain);
  return options.priorityByRoute.get(key) ?? SWAP_SERVICES.Bridgers;
};

export const chooseQuote = (
  quotes: QuoteResponse[],
  options?: ChooseQuoteOptions,
): QuoteResponse => {
  if (quotes.length === 0) {
    throw new Error("chooseQuote requires at least one quote");
  }

  const preferredService = getPreferredServiceForRoute(options);
  if (preferredService) {
    const preferred = preferServiceIfValid(quotes, preferredService);
    if (preferred) return preferred;
  }

  const byMinDeposit = quoteWithMinimalDeposit(quotes);
  return quoteWithBestOutput(quotes, byMinDeposit);
};
