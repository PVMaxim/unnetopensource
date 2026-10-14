import { isAddress as isEVMAddress } from "ethers";
import tokens from "../../manifests/swap-tokens.json";
import { SWAP_CHAINS } from "../../constants-types";
import {
  GetQuoteOutcome,
  GetQuoteParams,
  GetTransactionParams,
  HistoryTransaction,
  ICoreSwapService,
  ISwapService,
  QuoteResponse,
  SwapToken,
} from "../types";
import bridgers from "./bridgers";
import changelly from "./changelly";
import omni from "./omni";
import web3world from "./web3world";
import { Request } from "../../common";
import { serviceDexPriorityByRoute } from "../configs";
import { chooseQuote } from "../utils/quote";
import oneInchClassic from "./oneInchClassic";
import { isValidSolanaAddress, isValidVenomAddress } from "../utils/validate";
import oneInchFusionPlus from "./oneInchFusionPlus";
import { formatAmount } from "../utils/formatting";
import oneInchFusionV1 from "./oneInchFusionV1";
import oneInchFusionV2 from "./oneInchFusionV2";
import omniston from "./omniston";

const manifestTokensList = tokens as SwapToken[];

function tokenDedupKey(chain: string, address: string): string {
  const normalized =
    chain === SWAP_CHAINS.SOLANA ? address : address.toLowerCase();
  return `${chain}:${normalized}`;
}

class CoreSwapService implements ICoreSwapService {
  private _services: ISwapService[] = [
    bridgers,
    omni,
    changelly,
    web3world,
    oneInchClassic,
    omniston,
    oneInchFusionV2,
    oneInchFusionPlus,
    oneInchFusionV1,
  ];
  getSwapServiceByName(dexName: string): ISwapService | undefined {
    return this._services.find((s) => s.name === dexName);
  }

  async getQuote(
    params: GetQuoteParams,
    signal: AbortSignal,
  ): Promise<GetQuoteOutcome> {
    const suppotedServices = this._services.filter((service) =>
      service.checkDirection(params.fromToken, params.toToken),
    );
    if (suppotedServices.length === 0) {
      throw new Error("No swap service supports the selected tokens.");
    }
    console.log(
      "Supported services:",
      suppotedServices.map((s) => s.name),
    );
    const results = (
      await Promise.allSettled(
        suppotedServices.map((service) => service.getQuote(params, signal)),
      )
    )
      .filter(
        (result): result is PromiseFulfilledResult<QuoteResponse> =>
          result.status === "fulfilled" && !!result.value,
      )
      .map((res) => res.value);

    if (signal.aborted) {
      throw new Error("Aborted");
    }
    if (results.length === 0) {
      throw new Error("Not supported direction");
    }

    const selectedQuote = chooseQuote(results, {
      fromChain: params.fromToken.chain,
      toChain: params.toToken.chain,
      priorityByRoute: serviceDexPriorityByRoute,
    });

    const servicesResult = results.map((result) => {
      const hasOutput = Number(result.txData?.toTokenAmount ?? 0) > 0;
      return {
        service: result.txData.dex,
        amount: formatAmount(result.txData.toTokenAmount, 2),
        minAmount: formatAmount(result.txData?.depositMin ?? "0", 2),
        maxAmount: formatAmount(result.txData.depositMax ?? "0", 2),
        isSelected: selectedQuote.txData.dex === result.txData.dex,
        isSelectable: hasOutput,
      };
    });

    const selectedService = this.getSwapServiceByName(
      selectedQuote.txData.dex,
    );
    if (!selectedService) {
      throw new Error(
        `No service found with name: ${selectedQuote.txData.dex}`,
      );
    }

    return {
      quote: selectedQuote,
      allQuotes: results,
      servicesResult,
    };
  }

  async getTokens(): Promise<SwapToken[]> {
    const seen = new Set(
      manifestTokensList.map((t) => tokenDedupKey(t.chain, t.address)),
    );
    const merged: SwapToken[] = [...manifestTokensList];

    try {
      const oneInchTokens = await oneInchFusionPlus.getTokens();
      for (const token of oneInchTokens) {
        const key = tokenDedupKey(token.chain, token.address);
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(token);
      }
    } catch (err) {
      console.error("OneInch getTokens failed:", err);
    }

    return merged;
  }

  async createTransaction(
    params: GetTransactionParams,
    dexName: string,
  ): Promise<{ tx: Request; orderId: string }> {
    const service = this.getSwapServiceByName(dexName);
    if (!service) {
      throw new Error(`No swap service for dex: ${dexName}`);
    }
    return service.createTransaction(params);
  }

  async getSwapHistory(addresses: string[]): Promise<HistoryTransaction[]> {
    const uniqueAddresses = [...new Set(addresses)];

    const evmAddresses = uniqueAddresses.filter(isEVMAddress);
    const venomAddresses = uniqueAddresses.filter(isValidVenomAddress);
    const solanaAddresses = uniqueAddresses.filter(isValidSolanaAddress);

    const [
      bridgersHistory,
      omniHistory,
      changellyHistory,
      web3History,
      oneInchClassicHistory,
      oneInchFusionV1History,
      oneInchFusionV2History,
      oneInchFusionPlusHistory,
      omnistonHistory,
    ] = await Promise.all([
      bridgers.getHistory(uniqueAddresses),
      omni.getHistory(evmAddresses),
      changelly.getHistory(uniqueAddresses),
      web3world.getHistory(venomAddresses),
      oneInchClassic.getHistory(evmAddresses),
      oneInchFusionV1.getHistory(solanaAddresses),
      oneInchFusionV2.getHistory(evmAddresses),
      oneInchFusionPlus.getHistory([...evmAddresses, ...solanaAddresses]),
      omniston.getHistory(uniqueAddresses),
    ]);

    return [
      ...bridgersHistory,
      ...omniHistory,
      ...web3History,
      ...changellyHistory,
      ...oneInchClassicHistory,
      ...oneInchFusionV1History,
      ...oneInchFusionV2History,
      ...oneInchFusionPlusHistory,
      ...omnistonHistory,
    ];
  }

  async createPrepareTransaction(
    params: GetTransactionParams,
    dexName: string,
  ): Promise<Request> {
    const service = this.getSwapServiceByName(dexName);
    if (!service) {
      throw new Error(`No swap service for dex: ${dexName}`);
    }
    return service.createPrepareTransaction(params);
  }
}

export default new CoreSwapService();
