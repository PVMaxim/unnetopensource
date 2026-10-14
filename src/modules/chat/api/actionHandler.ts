/**
 * Chat Action Handler
 *
 * Maps SDK domain intents to existing business logic:
 * - show_balance  → fetches live token balances per network/currency
 * - send_funds    → prepares transfer data for the Send flow
 */

import { store } from '@/store/index';
import { rpcList } from '@/api/constants-types';
import { roundNumber } from '@/api/sub-utils';
import { createProviderManager } from '@/api/swap/utils/provider';
import type { ProcessResult } from './intentSdk';

export interface TokenBalanceEntry {
  symbol: string;
  balance: string;
  usdBalance: string;
}

export interface NetworkBalanceGroup {
  provider: string;
  tokens: TokenBalanceEntry[];
}

export interface BalanceResult {
  groups: NetworkBalanceGroup[];
  notice?: string;
}

export interface SendPrepareResult {
  amount: string;
  currency: string;
  toAccount: string;
  network: string;
}

export type ActionResult =
  | { type: 'show_balance'; data: BalanceResult }
  | { type: 'send_prepare'; data: SendPrepareResult }
  | { type: 'unsupported'; intent: string }
  | { type: 'none' };

/**
 * Resolve a network name from the SDK entity to an rpcList entry.
 */
function resolveRpcEntry(network?: string) {
  if (!network) return null;
  const lower = network.toLowerCase();

  const direct = rpcList.find(
    (r) => r.name.toLowerCase() === lower || r.swapChain.toLowerCase() === lower
  );
  if (direct) return direct;

  const aliases: Record<string, string> = {
    ethereum: 'Ethereum', eth: 'Ethereum',
    bnb: 'BNB Chain', bsc: 'BNB Chain', binance: 'BNB Chain',
    polygon: 'Polygon', matic: 'Polygon',
    arbitrum: 'Arbitrum', base: 'Base',
    avalanche: 'Avalanche', avax: 'Avalanche',
    solana: 'Solana', sol: 'Solana',
    bitcoin: 'Bitcoin', btc: 'Bitcoin',
    tron: 'Tron', trx: 'Tron',
    ton: 'Ton', venom: 'Venom',
    xrp: 'Xrp', ripple: 'Xrp',
    coti: 'Coti', katana: 'Katana',
  };
  const targetName = aliases[lower];
  return rpcList.find((r) => r.name === targetName) ?? null;
}

const FETCH_TIMEOUT_MS = 8000;

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: ${label}`)), ms)
    ),
  ]);
}

/**
 * Fetch live balances for a single chain. If `currencyFilter` is provided,
 * returns only the matching token (or empty array if user has not added it).
 */
async function fetchChainBalances(
  rpcEntry: { name: string; swapChain: string },
  publicKeyCard: any,
  currencyFilter?: string
): Promise<TokenBalanceEntry[]> {
  const manager = createProviderManager(rpcEntry.swapChain as any);
  const tokens = manager.getTokens();

  let filtered = tokens;
  if (currencyFilter) {
    const upper = currencyFilter.toUpperCase();
    filtered = [];
    for (const token of tokens) {
      try {
        const symbol = await token.getSymbol();
        if (symbol?.toUpperCase() === upper) filtered.push(token);
      } catch {
        // ignore tokens that fail symbol lookup
      }
    }
  }

  if (filtered.length === 0) return [];

  const ownerAddress = await withTimeout(
    manager.getWalletAddress(publicKeyCard),
    FETCH_TIMEOUT_MS,
    `${rpcEntry.name} wallet address`
  );

  const results = await Promise.allSettled(
    filtered.map(async (token) => {
      const [symbol, balance, price] = await Promise.all([
        token.getSymbol(),
        withTimeout(token.getBalance(ownerAddress), FETCH_TIMEOUT_MS, `${rpcEntry.name} balance`),
        token.getPrice().catch(() => undefined),
      ]);
      const balanceNum = parseFloat(balance) || 0;
      const priceNum = price?.usdPrice ? Number(price.usdPrice) : 0;
      const usd = balanceNum * priceNum;
      return {
        symbol: symbol ?? '',
        balance: roundNumber(balance, 6),
        usdBalance: roundNumber(String(usd), 2),
      };
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<TokenBalanceEntry> => r.status === 'fulfilled')
    .map((r) => r.value);
}

/**
 * Resolve `show_balance` intent into a BalanceResult by handling four cases:
 *   network + currency, network only, currency only, neither.
 */
export async function fetchBalanceData(
  network?: string,
  currency?: string
): Promise<BalanceResult> {
  const publicKeyCard = store.state.user.publicKeyCard;

  // Case 1 & 2: network specified
  if (network) {
    const rpc = resolveRpcEntry(network);
    if (!rpc) {
      return { groups: [], notice: `Unknown network: ${network}` };
    }
    const tokens = await fetchChainBalances(rpc, publicKeyCard, currency);
    if (tokens.length === 0 && currency) {
      return {
        groups: [],
        notice: `${currency.toUpperCase()} is not added on ${rpc.name}.`,
      };
    }
    return { groups: [{ provider: rpc.name, tokens }] };
  }

  // Case 3: currency only — search across all chains
  if (currency) {
    const upper = currency.toUpperCase();

    // Pre-filter chains where token is in user's list (mandatory + custom)
    const chainsWithToken: typeof rpcList = [];
    for (const rpc of rpcList) {
      try {
        const manager = createProviderManager(rpc.swapChain as any);
        const tokens = manager.getTokens();
        for (const t of tokens) {
          try {
            const sym = await t.getSymbol();
            if (sym?.toUpperCase() === upper) {
              chainsWithToken.push(rpc);
              break;
            }
          } catch { }
        }
      } catch {
        // skip chains that fail to initialise
      }
    }

    if (chainsWithToken.length === 0) {
      return {
        groups: [],
        notice: `${upper} is not added on any of your networks.`,
      };
    }

    const groupResults = await Promise.allSettled(
      chainsWithToken.map(async (rpc) => ({
        provider: rpc.name,
        tokens: await fetchChainBalances(rpc, publicKeyCard, currency),
      }))
    );

    const groups = groupResults
      .filter((r): r is PromiseFulfilledResult<NetworkBalanceGroup> => r.status === 'fulfilled')
      .map((r) => r.value)
      .filter((g) => g.tokens.length > 0);

    return { groups };
  }

  // Case 4: nothing specified — show current network's balances
  const currentProviderName = store.state.settings.rpcProvider?.name;
  const currentRpc = rpcList.find((r) => r.name === currentProviderName);
  if (!currentRpc) {
    return { groups: [], notice: 'No active network selected.' };
  }
  const tokens = await fetchChainBalances(currentRpc, publicKeyCard);
  return { groups: [{ provider: currentRpc.name, tokens }] };
}

/**
 * Execute a domain intent returned by the SDK.
 * Returns a Promise — show_balance is now async because it fetches live data.
 */
export async function executeAction(result: ProcessResult): Promise<ActionResult> {
  const intentType = result.intent_type ?? (result as any).intentType;
  if (result.status !== 'Done' || intentType !== 'domain') {
    return { type: 'none' };
  }

  const { intent, entities } = result;

  switch (intent) {
    case 'show_balance': {
      const data = await fetchBalanceData(entities.network, entities.currency);
      return { type: 'show_balance', data };
    }

    case 'send_funds': {
      return {
        type: 'send_prepare',
        data: {
          amount: entities.amount,
          currency: entities.currency,
          toAccount: entities.to_account,
          network: entities.network,
        },
      };
    }

    default:
      return { type: 'unsupported', intent: intent ?? 'unknown' };
  }
}
