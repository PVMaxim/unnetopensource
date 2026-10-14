import {
  GetQuoteParams,
  GetTransactionParams,
  ISwapService,
  QuoteResponse,
} from "../types";
import {
  SWAP_CHAINS,
  SWAP_HISTORY_STATUSES,
  SWAP_NATIVE_ADDRESS,
  SWAP_SERVICES,
} from "../../constants-types";
import { getExplorerTxUrl } from "../chainConfig";
import { SwapService } from "./swap";
import { Request } from "../../common";
import omnistonApi from "../api/omnistonApi";
import BigNumber from "bignumber.js";
import { getOwnerAddress } from "../utils/ownerAddress";
import { createProviderManagerAndToken } from "../utils/tokenBalances";
import { TonApiTransaction } from "../api/tonApi.types";
import { isTonAddress } from "../utils/validate";
import tonApi from "../api/tonApi";
import tokens from "../../manifests/swap-tokens.json";
import { formatHistoryDate } from "../utils/historyTime";
import { Address } from "@ton/core";
import { createProviderManager } from "../utils/provider";

const PROXY_TON_ADDRESSES = [
  "EQBnGWMCf3-FZZq1W4IWcWiGAc3PHuZ0_H-7sad2oY00o83S",
  "EQCM3B12QK1e4yZSf8GtBRT0aLMNyEsBc_DhVfRRtOEffLez",
];

const TONCO_ROUTER_ADDRESS =
  "0:bffadd270a738531da7b13ba8fc403826c2586173f9ede9c316fab53bc59ac86";

const CHAINS = {
  [SWAP_CHAINS.TON]: 607,
};

class OmnistonService extends SwapService implements ISwapService {
  private _name: string = SWAP_SERVICES.Omniston;
  public get name(): string {
    return this._name;
  }

  constructor() {
    super([SWAP_CHAINS.TON]);
  }

  normalizeAddress(address: string) {
    if (address === SWAP_NATIVE_ADDRESS) {
      return "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c";
    }
    return address;
  }

  async getQuote(
    { fromToken, toToken, amount }: GetQuoteParams,
  ): Promise<QuoteResponse> {
    try {
      const params = {
        bid_asset_address: {
          blockchain: CHAINS[fromToken.chain],
          address: this.normalizeAddress(fromToken.address),
        },
        ask_asset_address: {
          blockchain: CHAINS[toToken.chain],
          address: this.normalizeAddress(toToken.address),
        },
        amount: {
          bid_units: new BigNumber(amount)
            .shiftedBy(fromToken?.decimals)
            .toFixed(),
        },
        referrer_fee_bps: 100,
        referrer_address: {
          blockchain: CHAINS[fromToken.chain],
          address: "EQDGnsn-WyCJp0kIU5WkBQS7KsgxAgP0K7tVD-DAoEKbP_st",
        },
        settlement_methods: [0],
        settlement_params: {
          max_price_slippage_bps: 500,
          max_outgoing_messages: 4,
          gasless_settlement: 1,
          flexible_referrer_fee: false,
        },
      };
      const quote = await omnistonApi.getQuote(params);
      return {
        txData: {
          fromTokenAmount: new BigNumber(amount)
            .shiftedBy(fromToken.decimals)
            .decimalPlaces(0, BigNumber.ROUND_FLOOR)
            .toString(),
          fromTokenDecimal: fromToken.decimals,
          toTokenAmount: new BigNumber(quote.ask_units)
            .shiftedBy(-toToken?.decimals)
            .toFixed(),
          toTokenDecimal: toToken.decimals,
          amountOutMin: quote.ask_units,
          fee: 0,
          contractAddress: "",
          dex: SWAP_SERVICES.Omniston,
          path: [],
          feeToken: "",
          logoUrl: "",
          chainFee: "0",
          quote: quote,
        },
      };
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async createTransaction({
    fromProvider,
    fromToken,
    toToken,
    toProvider,
    publicKeyCard,
    quote,
  }: GetTransactionParams): Promise<{ tx: Request; orderId: string }> {
    const fromAddress = await getOwnerAddress(fromProvider, publicKeyCard);

    const toAddress = await getOwnerAddress(toProvider, publicKeyCard);
    const params = {
      destination_address: {
        blockchain: CHAINS[toToken.chain],
        address: toAddress,
      },
      gas_excess_address: {
        blockchain: CHAINS[fromToken.chain],
        address: fromAddress,
      },
      quote: quote!,
      source_address: {
        blockchain: CHAINS[fromToken.chain],
        address: fromAddress,
      },
      use_recommended_slippage: false,
    };

    const txData = await omnistonApi.buildTransaction(params);
    const { token } = await createProviderManagerAndToken(
      fromProvider,
      fromToken,
    );
    if (!token.swap) {
      throw new Error(
        `Swap method is not implemented for ${fromProvider.name} provider.`,
      );
    }
    const swapParams = {
      address: txData.ton.messages[0].target_address,
      amount: txData.ton.messages[0].send_amount,
      payload: txData.ton.messages[0].payload,
      keys: publicKeyCard,
    };

    const tx = await token.swap(swapParams);
    return { tx, orderId: "" };
  }

  private hasStonfiOutMsg(tx: TonApiTransaction): boolean {
    return (
      tx.out_msgs?.some(
        (m) =>
          m.decoded_body?.forward_payload?.value?.sum_type === "StonfiSwap" ||
          m.decoded_body?.forward_payload?.value?.sum_type === "StonfiSwapV2",
      ) ?? false
    );
  }

  private hasPtonTonInMsg(tx: TonApiTransaction): boolean {
    return !!(
      ((tx.in_msg?.decoded_body as any)?.payload &&
        (tx.in_msg?.decoded_body as any)?.payload[0]?.message?.message_internal
          ?.body?.value?.sum_type === "PtonTonTransfer") ||
      ((tx.in_msg?.decoded_body as any)?.actions &&
        (tx.in_msg?.decoded_body as any)?.actions[0]?.msg?.message_internal
          ?.body?.value?.sum_type === "PtonTonTransfer")
    );
  }

  private hasToncoRouterAddressInMsg(tx: TonApiTransaction): boolean {
    return !!(
      (tx.in_msg?.decoded_body as any)?.payload &&
      (tx.in_msg?.decoded_body as any)?.payload[0]?.message?.message_internal
        ?.body?.value?.value?.destination === TONCO_ROUTER_ADDRESS
    );
  }

  filterStonfiTransactions(
    transactions: TonApiTransaction[],
  ): TonApiTransaction[] {
    return transactions.filter(
      (tx) =>
        this.hasStonfiOutMsg(tx) ||
        this.hasPtonTonInMsg(tx) ||
        this.hasToncoRouterAddressInMsg(tx),
    );
  }

  private hasDedustOutMsg(tx: TonApiTransaction): boolean {
    return (
      tx.out_msgs?.some(
        (m) =>
          m.decoded_body?.forward_payload?.value?.sum_type === "DedustSwap",
      ) ?? false
    );
  }

  private hasDedustInMsg(tx: TonApiTransaction): boolean {
    return !!(
      (tx.in_msg?.decoded_body as any)?.payload &&
      (tx.in_msg?.decoded_body as any)?.payload[0]?.message?.message_internal
        ?.body?.value?.sum_type === "DedustSwap"
    );
  }

  filterDedustTransactions(
    transactions: TonApiTransaction[],
  ): TonApiTransaction[] {
    return transactions.filter(
      (tx) => this.hasDedustOutMsg(tx) || this.hasDedustInMsg(tx),
    );
  }

  async getJettonMasterAddress(
    jettonAddress: string,
  ): Promise<string | undefined> {
    try {
      const manager = createProviderManager(SWAP_CHAINS.TON);

      const res = await manager.provider.runMethod(
        Address.parse(jettonAddress),
        "get_wallet_data",
      );
      res.stack.readBigNumber(); // total_supply
      res.stack.readAddress(); // admin_address
      const jettonMaster = res.stack.readAddress();

      return jettonMaster.toString();
    } catch (error) {
      return;
    }
  }

  private findFirstInTrace<T>(
    trace: any,
    predicate: (msg: any) => T | null,
  ): T | null {
    if (!trace || typeof trace !== "object") return null;

    const intMsg = trace?.transaction?.in_msg;
    if (intMsg) {
      const result = predicate(intMsg);
      if (result !== null) return result;
    }

    const outMsgs = trace?.transaction?.out_msgs;
    if (Array.isArray(outMsgs)) {
      for (const msg of outMsgs) {
        const result = predicate(msg);
        if (result !== null) return result;
      }
    }

    if (Array.isArray(trace.children)) {
      for (const child of trace.children) {
        const res = this.findFirstInTrace(child, predicate);
        if (res !== null) return res;
      }
    }

    return null;
  }

  private findFirstOutMsgTrace<T>(
    trace: any,
    predicate: (msg: any) => T | null,
  ): T | null {
    if (!trace || typeof trace !== "object") return null;

    const outMsgs = trace?.transaction?.out_msgs;
    if (Array.isArray(outMsgs)) {
      for (const msg of outMsgs) {
        const result = predicate(msg);
        if (result !== null) return result;
      }
    }

    if (Array.isArray(trace.children)) {
      for (const child of trace.children) {
        const res = this.findFirstOutMsgTrace(child, predicate);
        if (res !== null) return res;
      }
    }

    return null;
  }

  private findLastInTrace<T>(
    trace: any,
    predicate: (msg: any) => T | null,
  ): T | null {
    let last: T | null = null;

    const traverse = (node: any) => {
      if (!node || typeof node !== "object") return;

      const intMsg = node?.transaction?.in_msg;
      if (intMsg) {
        const result = predicate(intMsg);
        if (result !== null) last = result;
      }

      const outMsgs = node?.transaction?.out_msgs;
      if (Array.isArray(outMsgs)) {
        for (const msg of outMsgs) {
          const result = predicate(msg);
          if (result !== null) last = result;
        }
      }

      if (Array.isArray(node.children)) {
        for (const child of node.children) {
          traverse(child);
        }
      }
    };

    traverse(trace);
    return last;
  }

  countDecodedOp(obj: unknown, opName: string): number {
    let count = 0;

    function walk(value: unknown) {
      if (!value || typeof value !== "object") return;

      if (
        typeof (value as any).decoded_op_name === "string" &&
        (value as any).decoded_op_name === opName
      ) {
        count++;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          walk(item);
        }
      } else {
        for (const v of Object.values(value as Record<string, unknown>)) {
          walk(v);
        }
      }
    }

    walk(obj);
    return count;
  }

  getJettonTokenAmount(trace: any): string | null {
    return this.findFirstInTrace(trace, (msg) =>
      msg?.decoded_op_name === "jetton_internal_transfer"
        ? msg.decoded_body.amount
        : null,
    );
  }

  getJettonWalletAddress(trace: any): string | null {
    return this.findFirstInTrace(trace, (msg) =>
      msg?.decoded_op_name === "stonfi_swap_v2"
        ? msg.decoded_body.dex_payload.token_wallet1
        : null,
    );
  }

  getToTonAmount(trace: any): string | null {
    return this.findFirstInTrace(trace, (msg) =>
      msg?.decoded_op_name === "pton_ton_transfer"
        ? msg.decoded_body.ton_amount
        : null,
    );
  }

  getJettonTransferAmount(trace: any): string | null {
    return this.findFirstInTrace(trace, (msg) =>
      msg?.decoded_op_name === "jetton_transfer"
        ? msg.decoded_body.amount
        : null,
    );
  }

  getFirstJettonInternalTransferAddress(trace: any): string | null {
    return this.findFirstInTrace(trace, (msg) =>
      msg?.decoded_op_name === "jetton_internal_transfer"
        ? msg.destination.address
        : null,
    );
  }

  getFirstJettonInternalTransferAmount(trace: any): string | null {
    return this.findFirstInTrace(trace, (msg) =>
      msg?.decoded_op_name === "jetton_internal_transfer"
        ? msg.decoded_body.amount
        : null,
    );
  }

  getLastJettonInternalTransferAmount(trace: any): string | null {
    return this.findLastInTrace(trace, (msg) =>
      msg?.decoded_op_name === "jetton_internal_transfer"
        ? msg.decoded_body.amount
        : null,
    );
  }

  getLastJettonInternalTransferAddress(trace: any): string | null {
    return this.findLastInTrace(trace, (msg) =>
      msg?.decoded_op_name === "jetton_internal_transfer"
        ? msg.destination?.address
        : null,
    );
  }

  getFirstJettonTransferAddress(trace: any): string | null {
    return this.findFirstInTrace(trace, (msg) =>
      msg?.decoded_op_name === "jetton_transfer"
        ? msg.destination.address
        : null,
    );
  }

  getFirstJettonTransferAmount(trace: any): string | null {
    return this.findFirstInTrace(trace, (msg) =>
      msg?.decoded_op_name === "jetton_transfer"
        ? msg.decoded_body.amount
        : null,
    );
  }

  getLastJettonTransferAmount(trace: any): string | null {
    return this.findLastInTrace(trace, (msg) =>
      msg?.decoded_op_name === "jetton_transfer"
        ? msg.decoded_body.amount
        : null,
    );
  }

  getLastJettonTransferAddress(trace: any): string | null {
    return this.findLastInTrace(trace, (msg) =>
      msg?.decoded_op_name === "jetton_transfer"
        ? msg.destination?.address
        : null,
    );
  }

  getTonAmountFromPtonTonTransfer(trace: any): string | null {
    const messages: any[] = [];

    messages.push(
      ...(trace?.transaction?.in_msg?.decoded_body?.actions ?? []).map(
        (a: any) => a?.msg,
      ),
    );

    const inMsgPayload = trace?.transaction?.in_msg?.decoded_body?.payload;

    messages.push(
      ...(inMsgPayload?.simple_send?.payload ?? []).map((p: any) => p?.message),
    );

    messages.push(
      ...(Array.isArray(inMsgPayload) ? inMsgPayload : []).map(
        (p: any) => p?.message,
      ),
    );

    for (const msg of messages) {
      const tonAmount = msg?.message_internal?.body?.value?.value?.ton_amount;

      if (typeof tonAmount === "string") {
        return tonAmount;
      }
    }

    return null;
  }

  async parseStonfiTransactionsV2(hashes: string[]) {
    const transactionTracesRequests = hashes.map((hash) =>
      tonApi().getTransactionTrace(hash),
    );
    const transactionTraces = await Promise.all(transactionTracesRequests);
    const results = await Promise.all(
      transactionTraces.map(async (trace) => {
        const isNativeFrom = JSON.stringify(trace.transaction.in_msg).includes(
          "PtonTonTransfer",
        );
        if (isNativeFrom) {
          let toAmount = "0";
          let toTokenAddress = "";

          const jettonAmount = this.getJettonTokenAmount(trace);
          if (jettonAmount) {
            toAmount = jettonAmount;
          }
          const jettonAddress = this.getJettonWalletAddress(trace);
          if (jettonAddress) {
            toTokenAddress =
              (await this.getJettonMasterAddress(jettonAddress)) || "";
          }

          const fromAmount = this.getTonAmountFromPtonTonTransfer(trace) || "0";

          return {
            fromTokenAddress: SWAP_NATIVE_ADDRESS,
            fromAmount,
            hash: trace.transaction.hash,
            toAmount,
            toTokenAddress,
          };
        }

        const outTonAmount = this.getToTonAmount(trace);
        if (outTonAmount) {
          const fromAmount = this.getJettonTransferAmount(trace);
          const jettonAddress =
            this.getFirstJettonInternalTransferAddress(trace);
          let fromTokenAddress = "";
          if (jettonAddress) {
            fromTokenAddress =
              (await this.getJettonMasterAddress(jettonAddress)) || "";
          }

          return {
            fromTokenAddress,
            fromAmount,
            hash: trace.transaction.hash,
            toAmount: outTonAmount,
            toTokenAddress: SWAP_NATIVE_ADDRESS,
          };
        }

        const countOFJettonInternalTransfer = this.countDecodedOp(
          trace,
          "jetton_internal_transfer",
        );

        if (countOFJettonInternalTransfer > 1) {
          const jettonWalletAddress =
            this.getFirstJettonInternalTransferAddress(trace);
          const fromTokenAddress = await this.getJettonMasterAddress(
            jettonWalletAddress!,
          );
          const lastJettonWalletAddress =
            this.getLastJettonInternalTransferAddress(trace);
          const toTokenAddress = await this.getJettonMasterAddress(
            lastJettonWalletAddress!,
          );
          const fromAmount = this.getFirstJettonInternalTransferAmount(trace);
          const toAmount = this.getLastJettonInternalTransferAmount(trace);

          return {
            fromTokenAddress,
            fromAmount,
            hash: trace.transaction.hash,
            toAmount,
            toTokenAddress,
          };
        }

        const countOFJettonTransfer = this.countDecodedOp(
          trace,
          "jetton_transfer",
        );

        if (countOFJettonTransfer > 1) {
          const jettonWalletAddress = this.getFirstJettonTransferAddress(trace);
          let fromTokenAddress = await this.getJettonMasterAddress(
            jettonWalletAddress!,
          );
          if (PROXY_TON_ADDRESSES.includes(fromTokenAddress!)) {
            fromTokenAddress = SWAP_NATIVE_ADDRESS;
          }
          const lastJettonWalletAddress =
            this.getLastJettonTransferAddress(trace);
          const toTokenAddress = await this.getJettonMasterAddress(
            lastJettonWalletAddress!,
          );
          const fromAmount = this.getFirstJettonTransferAmount(trace);
          const toAmount = this.getLastJettonTransferAmount(trace);

          return {
            fromTokenAddress,
            fromAmount,
            hash: trace.transaction.hash,
            toAmount,
            toTokenAddress,
          };
        }
      }),
    );
    return results;
  }

  findDedustSwapBody(trace: any): any | null {
    return this.findFirstOutMsgTrace(trace, (msg) =>
      msg?.decoded_op_name === "dedust_swap" ? msg.decoded_body : null,
    );
  }

  async parseDedustTransactions(hashes: string[]) {
    const transactionTracesRequests = hashes.map((hash) =>
      tonApi().getTransactionTrace(hash),
    );
    const transactionTraces = await Promise.all(transactionTracesRequests);
    const dedustBodys = transactionTraces.map((trace) => ({
      body: this.findDedustSwapBody(trace),
      hash: trace.transaction.hash,
    }));
    const dedustSwap = dedustBodys.map(({ body, hash }) => {
      if (!body) {
        throw new Error("Dedust swap body not found");
      }
      const fromTokenAddress =
        body.asset_in.sum_type === "Native"
          ? SWAP_NATIVE_ADDRESS
          : Address.parse(`0:${body.asset_in.jetton.address}`).toString();
      const toTokenAddress =
        body.asset_out.sum_type === "Native"
          ? SWAP_NATIVE_ADDRESS
          : Address.parse(`0:${body.asset_out.jetton.address}`).toString();
      return {
        fromTokenAddress,
        toTokenAddress,
        hash,
        fromAmount: body.amount_in,
        toAmount: body.amount_out,
      };
    });
    return dedustSwap;
  }
  async getSwapHistory(addresses: string[]) {
    const tonAddresses = addresses.filter(isTonAddress);
    const transactionsPromises = tonAddresses.map((address) =>
      tonApi().getAccountTransactions(address, new AbortController().signal),
    );
    const transactions = await Promise.all(transactionsPromises);
    const hashTimes = new Map<string, string>();
    transactions.forEach((transaction) => {
      transaction.forEach((tx) => {
        hashTimes.set(
          tx.hash,
          new Date(tx.utime * 1000)
            .toISOString()
            .replace("T", " ")
            .split(".")[0],
        );
      });
    });
    const stonfiHashes = this.filterStonfiTransactions(transactions.flat()).map(
      (tx) => tx.hash,
    );

    const stonfiHistory = await this.parseStonfiTransactionsV2(stonfiHashes);
    const dedustHashes = this.filterDedustTransactions(transactions.flat()).map(
      (tx) => tx.hash,
    );
    const dedustHistory = await this.parseDedustTransactions(dedustHashes);

    const history = [...stonfiHistory, ...dedustHistory]
      .filter((swapItem) => swapItem !== undefined)
      .map((swapItem) => {
        const fromToken = tokens.find(
          (token) =>
            token.chain === SWAP_CHAINS.TON &&
            token.address.toLowerCase() ===
              swapItem.fromTokenAddress?.toLowerCase(),
        );
        if (!fromToken) {
          return null;
        }

        const toToken = tokens.find(
          (token) =>
            token.chain === SWAP_CHAINS.TON &&
            token.address.toLowerCase() ===
              swapItem.toTokenAddress?.toLowerCase(),
        );
        if (!toToken) {
          return null;
        }

        return {
          fromChain: SWAP_CHAINS.TON,
          toChain: SWAP_CHAINS.TON,
          id: swapItem.hash,
          fromTokenAmount: new BigNumber(swapItem.fromAmount)
            .shiftedBy(-(fromToken?.decimals ?? 0))
            .toString(),
          toTokenAmount: new BigNumber(swapItem.toAmount)
            .shiftedBy(-(toToken?.decimals ?? 0))
            .toString(),

          status:
            swapItem.toAmount === "0"
              ? SWAP_HISTORY_STATUSES.FAILED
              : SWAP_HISTORY_STATUSES.SUCCESS,
          createTime: formatHistoryDate(
            hashTimes.get(swapItem.hash)?.toString() || "",
            SWAP_SERVICES.Omniston,
          ),
          depositHashExplore: getExplorerTxUrl(SWAP_CHAINS.TON, swapItem.hash),
          orderId: swapItem.hash,
          fromTokenSymbol: fromToken.symbol,
          toTokenSymbol: toToken.symbol,
          provider: SWAP_SERVICES.Omniston,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return history;
  }

  async createPrepareTransaction({
    fromProvider,
    fromToken,
    toToken,
    fromAmount,
    amountOutMin,
    slippage,
    toProvider,
    publicKeyCard,
    quote,
  }: GetTransactionParams): Promise<Request> {
    const { tx } = await this.createTransaction({
      fromProvider,
      fromToken,
      toToken,
      fromAmount,
      amountOutMin,
      slippage,
      toProvider,
      publicKeyCard,
      quote,
    });
    return tx;
  }
}

export default new OmnistonService();
