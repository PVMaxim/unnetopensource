import {
  PendingRequest,
  QuoteParams,
  SwapQuoteResponse,
  WSBuildTransactionRequest,
  WSBuildTransactionResponse,
  WSQuoteResponse,
  WSRequest,
  WSRequestParams,
  WSResponse,
  WSResponseRequest,
} from "./omnistonApi.types";

enum WSClientState {
  CONNECTING = "CONNECTING",
  CONNECTED = "CONNECTED",
  DISCONNECTED = "DISCONNECTED",
  ERROR = "ERROR",
}

export enum WSMethods {
  QUOTE = "v1beta7.quote",
  QUOTE_UNSUBSCRIBE = "v1beta7.quote.unsubscribe",
  BUILD_TRANSACTION = "v1beta7.transaction.build_transfer",
}

class WSClient {
  private ws!: WebSocket;
  private pending: Map<number, PendingRequest>;
  private subscriptions: Map<number | string, PendingRequest>;
  private id: number = 0;
  private state: WSClientState = WSClientState.DISCONNECTED;
  private url: string;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;

  constructor(url: string) {
    this.url = url;
    this.pending = new Map();
    this.subscriptions = new Map();
    this.initializeWebSocket();
  }

  private initializeWebSocket(): void {
    try {
      this.state = WSClientState.CONNECTING;
      this.ws = new WebSocket(this.url);
      this.setupEventHandlers();
    } catch (error) {
      this.state = WSClientState.ERROR;
      console.error("Failed to create WebSocket:", error);
    }
  }

  private setupEventHandlers(): void {
    this.ws.onopen = () => {
      this.state = WSClientState.CONNECTED;
      this.reconnectAttempts = 0;
      console.log("WebSocket connected");
    };

    this.ws.onmessage = (wsEvent) => this.handleMessage(wsEvent);

    this.ws.onerror = (event) => {
      this.state = WSClientState.ERROR;
      console.error("WebSocket error:", event);
    };

    this.ws.onclose = () => {
      this.state = WSClientState.DISCONNECTED;
      this.attemptReconnect();
    };
  }

  private handleMessage(wsEvent: MessageEvent): void {
    try {
      const msg = JSON.parse(wsEvent.data) as WSResponse<unknown>;

      if (this.isErrorResponse(msg)) {
        this.handleErrorResponse(msg);
        return;
      }

      if (this.isQuoteSubscriptionResponse(msg)) {
        this.handleQuoteSubscriptionResponse(msg);
        return;
      }

      if (this.isQuoteUpdateEvent(msg)) {
        this.handleQuoteUpdateEvent(msg);
        return;
      }

      if (this.isBuildTransactionResponse(msg)) {
        this.handleBuildTransactionResponse(msg);
        return;
      }

      if (this.isNoQuoteEvent(msg)) {
        this.handleNoQuoteEvent(msg);
        return;
      }
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  }

  private isErrorResponse(msg: WSResponse<unknown>): boolean {
    return !!(msg.error && msg.id && this.pending.has(msg.id));
  }

  private handleErrorResponse(msg: WSResponse<unknown>): void {
    const id = msg.id!;
    const { reject, timeout } = this.pending.get(id)!;
    clearTimeout(timeout);
    this.pending.delete(id);
    reject(new Error(msg.error!.message));
  }

  private isQuoteSubscriptionResponse(msg: WSResponse<unknown>): boolean {
    return !!(
      msg.id &&
      this.pending.has(msg.id) &&
      this.pending.get(msg.id)?.method === WSMethods.QUOTE &&
      typeof msg.result === "number"
    );
  }

  private handleQuoteSubscriptionResponse(msg: WSResponse<unknown>): void {
    const id = msg.id!;
    const pending = this.pending.get(id)!;
    this.subscriptions.set(msg.result as number, pending);
    this.pending.delete(id);
  }

  private isQuoteUpdateEvent(msg: WSResponse<unknown>): boolean {
    return !!(
      msg.method === "event" &&
      msg.params?.subscription &&
      (msg.params.result as WSQuoteResponse)?.event?.quote_updated
    );
  }

  private handleQuoteUpdateEvent(msg: WSResponse<unknown>): void {
    const subscriptionId = msg.params!.subscription as number;

    if (!this.subscriptions.has(subscriptionId)) {
      return;
    }

    const subscriptionPending = this.subscriptions.get(subscriptionId)!;
    const { resolve, timeout } = subscriptionPending;

    clearTimeout(timeout);
    const quoteUpdated = (
      (msg.params!.result as Record<string, unknown>)?.event as Record<
        string,
        unknown
      >
    )?.quote_updated;
    resolve(quoteUpdated as any);

    this.subscriptions.delete(subscriptionId);
    this.unsubscribe(subscriptionId);
  }

  private isBuildTransactionResponse(msg: WSResponse<unknown>): boolean {
    return !!(
      msg.id &&
      this.pending.has(msg.id) &&
      this.pending.get(msg.id)?.method === WSMethods.BUILD_TRANSACTION &&
      msg.result
    );
  }

  private handleBuildTransactionResponse(msg: WSResponse<unknown>): void {
    const id = msg.id!;
    const pending = this.pending.get(id)!;
    const { resolve, timeout } = pending;
    this.pending.delete(id);
    clearTimeout(timeout);
    resolve(msg.result as any);
  }
  private isNoQuoteEvent(msg: WSResponse<unknown>): boolean {
    return !!(
      msg.method === "event" &&
      msg.params?.subscription &&
      (msg.params.result as WSQuoteResponse)?.event?.no_quote
    );
  }

  private handleNoQuoteEvent(msg: WSResponse<unknown>): void {
    const subscriptionId = msg.params!.subscription as number;
    const { reject, timeout } = this.subscriptions.get(subscriptionId)!;
    reject(new Error("Received no_quote event"));
    clearTimeout(timeout);
    this.subscriptions.delete(subscriptionId);
    this.unsubscribe(subscriptionId);
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay =
        this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      console.log(
        `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
      );
      setTimeout(() => this.initializeWebSocket(), delay);
    } else {
      console.error("Max reconnection attempts reached");
    }
  }

  request<T = WSResponseRequest>(
    method: WSMethods,
    params: WSRequestParams,
    timeoutMs: number = 10000,
  ): Promise<T> {
    if (this.state !== WSClientState.CONNECTED) {
      return Promise.reject(
        new Error(`Cannot send request: WebSocket is ${this.state}`),
      );
    }

    const id = ++this.id;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error("WS request timeout"));
      }, timeoutMs);

      this.pending.set(id, {
        resolve: resolve as (value: any) => void,
        reject,
        timeout,
        method,
        subscriptionId: "",
      });

      try {
        this.ws.send(
          JSON.stringify({
            id,
            method,
            params,
            jsonrpc: "2.0",
          } as WSRequest),
        );
      } catch (error) {
        this.pending.delete(id);
        clearTimeout(timeout);
        reject(new Error(`Failed to send WebSocket request: ${error}`));
      }
    });
  }

  private unsubscribe(subscribeId: number): void {
    if (this.state !== WSClientState.CONNECTED) {
      console.warn("Cannot unsubscribe: WebSocket is not connected");
      return;
    }

    const id = ++this.id;
    try {
      this.ws.send(
        JSON.stringify({
          id,
          method: WSMethods.QUOTE_UNSUBSCRIBE,
          jsonrpc: "2.0",
          params: [subscribeId],
        } as WSRequest),
      );
    } catch (error) {
      console.error("Failed to send unsubscribe request:", error);
    }
  }

  close(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
    this.state = WSClientState.DISCONNECTED;
    this.pending.clear();
    this.subscriptions.clear();
  }

  isConnected(): boolean {
    return this.state === WSClientState.CONNECTED;
  }
}

class OmnistonApi {
  private wsClient: WSClient;
  private static readonly DEFAULT_URL = "wss://omni-ws.ston.fi/";

  constructor(url: string = OmnistonApi.DEFAULT_URL) {
    this.wsClient = new WSClient(url);
  }

  async getQuote(params: QuoteParams): Promise<SwapQuoteResponse> {
    if (!this.wsClient.isConnected()) {
      throw new Error("WebSocket client is not connected");
    }

    const method = WSMethods.QUOTE;
    return await this.wsClient.request(method, params);
  }

  async buildTransaction(
    params: WSBuildTransactionRequest,
  ): Promise<WSBuildTransactionResponse> {
    if (!this.wsClient.isConnected()) {
      throw new Error("WebSocket client is not connected");
    }
    const method = WSMethods.BUILD_TRANSACTION;
    return await this.wsClient.request<WSBuildTransactionResponse>(
      method,
      params,
    );
  }

  close(): void {
    this.wsClient.close();
  }

  isConnected(): boolean {
    return this.wsClient.isConnected();
  }
}

export default new OmnistonApi();
