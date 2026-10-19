export interface Logger {
    debug(message: string): any;
    info(message: string): any;
    warn(message: string): any;
    error(message: string): any;
}

export interface CardKeys {
    ioPublicKey?: string,
    secp256k1?: string,
    ed25519?: string,
}

export enum CardErrorCode {
    Success = 0,
    BadPin = 1,
    CardLocked = 2,
}

export type TransactionDirection = "in" | "out";

export interface TransactionInfo {
    id: string;
    success: boolean;
    confirmed: boolean,
    direction: TransactionDirection;
    timestamp: number;
    amount: string;
    scannerUrl: string;
}

export interface TokenTransactionInfo extends TransactionInfo {
    tokenId: string;
}

export interface HistoryProvider {
    getNativeTransactions(owner: string): Promise<TransactionInfo[]>;

    getTokenTransactions(args: {
        token: string,
        owner: string,
    }): Promise<TransactionInfo[]>;

    getAllTokenTransactions(owner: string): Promise<TokenTransactionInfo[]>;
}

export interface RequestChunk {
    isSigned(): boolean;

    buildCardRequest(args: {
        pin: string,
    }): Promise<Uint8Array>;

    getExpectedResponseSize(): number;

    processCardResponse(rawData: Uint8Array | ArrayBuffer): {
        errorCode: CardErrorCode,
        keys: CardKeys,
        pinRemaining: number,
    };
}

export interface Request {
    readonly chunks: RequestChunk[];
    estimateFee(): Promise<string>;
    send(): Promise<string>;
}

export interface TokenPriceInfo {
    usdPrice: string;
    usd24hChange: string;
}

export interface Token {

    readonly id: string;
    readonly isNative: boolean;
    readonly isMandatory: boolean;

    getName(): Promise<string>;
    getSymbol(): Promise<string>;
    getBalance(owner: string): Promise<string>;
    getAvailableBalance(owner: string): Promise<string>;
    getPrice(): Promise<TokenPriceInfo | undefined>;
    getDecimals(): Promise<number>;
    getIconUrl(): Promise<string | undefined>;
    getAddress(): string;
    getApprovedAmount?(args: {
        owner: string,
        spender: string,
    }): Promise<string>;

    getWalletAddress?(owner: string): Promise<string>;

    transfer(args: {
        recipient: string,
        amount: number | string,
        keys?: CardKeys,
        extraId?: string,
    }): Promise<Request>;

    getTransactions(args: {
        owner: string,
        limit: number,
        offset?: number,
    }): Promise<{
        total: number,
        items: TransactionInfo[],
    }>;

    swap?(args: any): Promise<Request>;
    wrap?(args: {
        amount: number | string;
        keys?: CardKeys;
    }): Promise<Request>
    approve?(args: {
        spender: string; 
        amount: number | string;
        keys?: CardKeys;
    }): Promise<Request>

}

export interface TokenMetadataInput {
    address: string,
    name?: string,
    symbol?: string,
    decimals?: number,
    ticker?: string,
    isMandatory?: boolean,
    icon?: string,
}

export interface BlockchainManager {
    readonly type: "bitcoin" | "coti" | "evm" | "solana" | "ton" | "tron" | "venom" | "xrpl";
    readonly nativeCoin: Token;

    addToken(token: Token): void;
    addTokenByMetadata(metadata: TokenMetadataInput): void;

    getToken(id: string): Token | undefined;
    getTokens(): Token[];
    findTokens(text: string): Promise<Token[]>;
    createToken(metadata: TokenMetadataInput): Token;

    getWalletAddress(keys: CardKeys): Promise<string>;
    isValidAddress(address: string): boolean;

    getTransactions(args: {
        owner: string,
        limit: number,
        offset?: number,
    }): Promise<{
        total: number,
        items: TokenTransactionInfo[],
    }>;
}

export interface Storage {
    set(key: string, value: string): Promise<void>;
    get(key: string): Promise<string | undefined>;
}
