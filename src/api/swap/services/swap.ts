import { HistoryTransaction, SwapToken } from "../types";

export class SwapService {
  protected _suportedProviders: string[] = [];
  protected _history: HistoryTransaction[] = [];

  constructor(supportedProviders: string[]) {
    this._suportedProviders = supportedProviders;
  }

  async getHistory(addresses: string[]): Promise<HistoryTransaction[]> {
    try {
      const data = await this.getSwapHistory(addresses);
      this._history = data;
      return data;
    } catch (e) {
      console.warn("Ошибка, возвращаю кэш", e);
      return this._history;
    }
  }

  async getSwapHistory(addresses: string[]): Promise<HistoryTransaction[]> {
    throw new Error("Method not implemented.");
  }

  checkDirection(fromToken: SwapToken, toToken: SwapToken): boolean {
    return (
      this._suportedProviders.includes(fromToken.chain) &&
      this._suportedProviders.includes(toToken.chain)
    );
  }
}
