
const UniErrors = {
    INTERNAL_ERROR: "Internal error",
    INVALID_ARGUMENT: "Invalid argument",
    NETWORK_ERROR: "Network error",
    SERVER_ERROR: "Server error",
    INVALID_CARD_RESPONSE: "Invalid card response",
    WALLET_NOT_DEPLOYED: "Wallet not deployed",
    WALLET_ALREADY_DEPLOYED: "Wallet already deployed",
    PUBLIC_KEY_MISMATCH: "Public key mismatch",
    NOT_SUPPORTED: "Not supported",
    LOW_BALANCE: "Low balance",
    SAME_SENDER_AND_RECIPIENT: "Same sender and recipient",
    AMOUNT_TOO_SMALL: "Amount too small",
    NOT_SIGNED: "Not signed",
    OUTDATED_TRANSACTION: "Outdated transaction",
    LOW_DST_LIMIT: "Low destination token limit",
    TOO_MANY_DECIMALS: "Too many decimals",
    ONBOARDING_REQUIRED: "Onboarding required",
};

type UniErrorCode = keyof (typeof UniErrors);

export class UniError extends Error {
    code: UniErrorCode;

    constructor(code: UniErrorCode, message?: string) {
        super(message ?? UniErrors[code]);
        this.code = code;
    }

    toJSON(): any {
        return { code: this.code, message: this.message };
    }
}

export class UniLowBalanceError extends UniError {
    constructor(readonly tokenId: string) {
        super("LOW_BALANCE", `Low balance : tokenId=${tokenId}`);
    }
}

export class UniTooManyDecimalsError extends UniError {
    constructor(readonly maxDecimals: number) {
        super("TOO_MANY_DECIMALS", `Too many decimals : maxDecimals=${maxDecimals}`);
    }
}

export class UniAmountTooSmallError extends UniError {
    constructor(readonly minAmount: string) {
        super("AMOUNT_TOO_SMALL", `Amount too small : minAmount=${minAmount}`);
    }
}

export function assert(condition: unknown, message?: string): asserts condition {
    if( !condition ) {
        throw new UniError("INTERNAL_ERROR", message);
    }
}

export function assertArgument(condition: unknown, message?: string): asserts condition {
    if( !condition ) {
        throw new UniError("INVALID_ARGUMENT", message);
    }
}
