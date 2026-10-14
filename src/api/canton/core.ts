import { Buffer } from "buffer";
import { decodeJwt } from "jose";
import { ValidatorInternalClient } from "@canton-network/core-splice-client";
import { LedgerClient } from "@canton-network/core-ledger-client";
import { PartyId } from "@canton-network/core-types";
import { AccessTokenProvider, jwtUserId } from "@canton-network/core-wallet-auth";
import { TokenStandardService } from "@canton-network/core-token-standard-service";
import { LedgerProvider, Ops } from "@canton-network/core-provider-ledger";
import pino from "pino";
import { v4 } from "uuid";
import { CantonUserManager } from "./user-manager";
import { getCardKeyFingerprint } from "./utils";
import { CmdSignEd25519 } from "../card-io";
import { CardErrorCode, CardKeys, Request, RequestChunk } from "../common";
import { UniError } from "../errors";
import { getEd25519Key, LazyValue } from "../utils";

function createPinoLogger(name: string) {
    try {
        const pinoFn = typeof pino === "function" ? pino : (pino as any)?.pino || (pino as any)?.default;
        if (typeof pinoFn === "function") {
            return pinoFn({ name, level: "error" });
        }
    } catch (e) {
        // fallback
    }
    return {
        info: () => {},
        error: console.error.bind(console),
        warn: console.warn.bind(console),
        debug: () => {},
        trace: () => {},
        child: () => createPinoLogger(name)
    } as any;
}

///////////////////////////////////////////////////////////////////////////////
const PARTY_HINT = "wallet-1";


///////////////////////////////////////////////////////////////////////////////
export interface CantonAsset {
    id: string,
    displayName: string,
    symbol: string,
    registryUrl: string,
    admin: PartyId,
}


///////////////////////////////////////////////////////////////////////////////
export class LazyEd25519RequestChunk implements RequestChunk {

    private readonly _command: CmdSignEd25519;
    private readonly _getHash: () => Promise<string>;
    private readonly _expectedPublicKey: string;
    private _publicKey?: string;
    private _signature?: string;

    constructor(args: {
        getHash: () => Promise<string>,
        expectedPublicKey: string,
    }) {
        this._command = new CmdSignEd25519();
        this._getHash = args.getHash;
        this._expectedPublicKey = args.expectedPublicKey;
    }

    get publicKey(): string | undefined {
        return this._publicKey;
    }

    get signature(): string | undefined {
        return this._signature;
    }

    isSigned(): boolean {
        return !!this._signature;
    }

    getExpectedResponseSize(): number {
        return this._command.getExpectedResponseSize();
    }

    async buildCardRequest(args: {
        pin: string,
    }): Promise<Uint8Array> {
        return this._command.buildRequest({
            dataHash: await this._getHash(),
            pin: args.pin,
        });
    }

    processCardResponse(rawData: Uint8Array | ArrayBuffer): {
        errorCode: CardErrorCode,
        keys: CardKeys,
        pinRemaining: number,
    } {
        const { errorCode, keys, signature, pinRemaining } = this._command.parseResponse(rawData);

        if( errorCode === CardErrorCode.Success ) {
            const publicKey = getEd25519Key(keys);

            if( !!this._expectedPublicKey &&
                publicKey.toLowerCase() !== this._expectedPublicKey?.toLowerCase()
            ) {
                throw new UniError("PUBLIC_KEY_MISMATCH");
            }

            this._publicKey = publicKey;
            this._signature = signature;
        }

        return { errorCode, keys, pinRemaining };
    }
}


///////////////////////////////////////////////////////////////////////////////
export class CantonLedgerRequest implements Request {

    readonly chunks: LazyEd25519RequestChunk[];

    private readonly _getCore: () => Promise<CantonCore>;
    private readonly _keys: CardKeys;
    private readonly _preparedTx: LazyValue<Ops.PostV2InteractiveSubmissionPrepare["ledgerApi"]["result"]>;

    constructor(args: {
        getCore: () => Promise<CantonCore>,
        keys: CardKeys,
        lazyArgs: () => Promise<{
            commands: Ops.PostV2InteractiveSubmissionPrepare["ledgerApi"]["params"]["body"]["commands"],
            commandId?: string,
            synchronizerId?: string,
            disclosedContracts?: any[],
        }>,
    }) {
        this._getCore = args.getCore;
        this._keys = args.keys;

        this._preparedTx = new LazyValue(async () => {
            const lazyArgs = await args.lazyArgs();
            const core = await args.getCore();
            const userId = await core.getUserId();
            const partyId = await CantonCore.getWalletAddress(args.keys);
            const synchronizerId = lazyArgs.synchronizerId ?? (await core.defaultSynchronizerId.get());

            return core.ledgerProvider.request<Ops.PostV2InteractiveSubmissionPrepare>({
                method: "ledgerApi",
                params: {
                    resource: "/v2/interactive-submission/prepare",
                    requestMethod: "post",
                    body: {
                        commands: lazyArgs.commands,
                        commandId: lazyArgs.commandId ?? v4(),
                        userId,
                        actAs: [partyId],
                        readAs: [],
                        disclosedContracts: lazyArgs.disclosedContracts,
                        synchronizerId,
                        packageIdSelectionPreference: [],
                    },
                },
            });
        });

        this.chunks = [
            new LazyEd25519RequestChunk({
                getHash: async () => {
                    const preparedTx = await this._preparedTx.get();
                    const hashBase64 = preparedTx.preparedTransactionHash;
                    return Buffer.from(hashBase64, "base64").toString("hex");
                },
                expectedPublicKey: getEd25519Key(args.keys),
            }),
        ];
    }

    async estimateFee(): Promise<string> {
        return "0";
    }

    async send(): Promise<string> {
        const signature = this.chunks[0].signature;

        if( !signature ) {
            throw new UniError("INVALID_ARGUMENT", "Request is not signed");
        }

        const core = await this._getCore();
        const userId = await core.getUserId();
        const partyId = await CantonCore.getWalletAddress(this._keys);
        const preparedTx = await this._preparedTx.get();

        const response = await core.ledgerProvider.request<Ops.PostV2InteractiveSubmissionExecuteAndWait>({
            method: "ledgerApi",
            params: {
                resource: "/v2/interactive-submission/executeAndWait",
                requestMethod: "post",
                body: {
                    userId,
                    preparedTransaction: preparedTx.preparedTransaction,
                    // wallet sdk explicitly uses V2 for some reason so we do the same here
                    hashingSchemeVersion: "HASHING_SCHEME_VERSION_V2",
                    submissionId: v4(),
                    deduplicationPeriod: {
                        Empty: {},
                    },
                    partySignatures: {
                        signatures: [
                            {
                                party: partyId,
                                signatures: [
                                    {
                                        signature: Buffer.from(signature, "hex").toString("base64"),
                                        signedBy: await getCardKeyFingerprint(this._keys),
                                        format: "SIGNATURE_FORMAT_CONCAT",
                                        signingAlgorithmSpec: "SIGNING_ALGORITHM_SPEC_ED25519",
                                    },
                                ],
                            },
                        ],
                    },
                },
            },
        });

        return response.updateId;
    }
}


///////////////////////////////////////////////////////////////////////////////
export class CantonOnboardingStep extends CantonLedgerRequest {
    readonly actionType: string;

    constructor(args: {
        getCore: () => Promise<CantonCore>,
        keys: CardKeys,
        lazyArgs: () => Promise<{
            commands: Ops.PostV2InteractiveSubmissionPrepare["ledgerApi"]["params"]["body"]["commands"],
            commandId?: string,
            synchronizerId?: string,
            disclosedContracts?: any[],
        }>,
        actionType: string,
    }) {
        super(args);
        this.actionType = args.actionType;
    }
}


///////////////////////////////////////////////////////////////////////////////
export class CantonAuthTokenProvider implements AccessTokenProvider {

    readonly EXPIRATION_THRESHOLD_MS = 30 * 1000;

    private _cachedToken?: string;
    private _cachedExpiration: number;

    constructor(
        readonly userManager: CantonUserManager,
        readonly keys: CardKeys,
    ) {
        this._cachedExpiration = 0;
    }

    async getAccessToken() {
        if( this._cachedToken && this._cachedExpiration > Date.now() ) {
            return this._cachedToken;
        }

        const token = await this.userManager.getAuthToken(this.keys);
        const expiration = this._getExpiration(token) - this.EXPIRATION_THRESHOLD_MS;

        if( expiration <= Date.now() ) {
            throw new UniError("INTERNAL_ERROR", "Received already expired JWT");
        }

        this._cachedToken = token;
        this._cachedExpiration = expiration;

        return token;
    }

    async getAuthContext() {
        const accessToken = await this.getAccessToken();
        const userId = jwtUserId(accessToken);
        return { accessToken, userId };
    }

    private _getExpiration(token: string) {
        try {
            const decoded = decodeJwt(token);
            return (decoded.exp ?? 0) * 1000;
        } catch(_) {
            return 0;
        }
    }
}


///////////////////////////////////////////////////////////////////////////////
export class CantonCore {

    readonly accessTokenProvider: AccessTokenProvider;
    readonly ledgerProvider: LedgerProvider;
    readonly tokenStdService: TokenStandardService;
    readonly validatorParty: LazyValue<string>;
    readonly defaultSynchronizerId: LazyValue<string>;
    readonly assets: LazyValue<CantonAsset[]>;

    constructor(args: {
        userManager: CantonUserManager,
        ledgerUrl: string,
        validatorUrl: string,
        registries: string[],
        keys: CardKeys,
    }) {
        const logger = createPinoLogger("uni-core");
        this.accessTokenProvider = new CantonAuthTokenProvider(args.userManager, args.keys);

        this.ledgerProvider = new LedgerProvider({
            baseUrl: new URL(args.ledgerUrl),
            accessTokenProvider: this.accessTokenProvider,
        });

        this.tokenStdService = new TokenStandardService(
            this.ledgerProvider,
            logger,
            this.accessTokenProvider,
            false,
        );

        this.validatorParty = new LazyValue(async () => {
            const validator = new ValidatorInternalClient(
                new URL(args.validatorUrl),
                logger,
                this.accessTokenProvider,
            );

            return (await validator.get("/v0/validator-user")).party_id;
        });

        this.defaultSynchronizerId = new LazyValue(() => {
            return new LedgerClient({
                baseUrl: new URL(args.ledgerUrl),
                accessTokenProvider: this.accessTokenProvider,
                logger,
            }).getSynchronizerId();
        });

        this.assets = new LazyValue(async () => this.tokenStdService.registriesToAssets(args.registries));
    }

    static async getWalletAddress(keys: CardKeys): Promise<string> {
        const fingerprint = await getCardKeyFingerprint(keys);
        return `${PARTY_HINT}::${fingerprint}`;
    }

    async createLedgerRequest(args: {
        keys: CardKeys,
        commands: Ops.PostV2InteractiveSubmissionPrepare["ledgerApi"]["params"]["body"]["commands"],
        commandId?: string,
        synchronizerId?: string,
        disclosedContracts?: any[],
    }) {
        return new CantonLedgerRequest({
            getCore: async () => this,
            keys: args.keys,
            lazyArgs: async () => args,
        });
    }

    async getUserId(): Promise<string> {
        const authenticatedUser = await this.ledgerProvider.request<Ops.GetV2AuthenticatedUser>({
            method: "ledgerApi",
            params: {
                requestMethod: "get",
                resource: "/v2/authenticated-user",
                query: {},
            },
        });

        const userId = authenticatedUser.user?.id;
        if( !userId ) {
            throw new UniError("INTERNAL_ERROR", "Not authenticated");
        }

        return userId;
    }

    async findAsset(args: {
        id: string,
        admin: string,
    }): Promise<CantonAsset | null> {
        const assets = await this.assets.get();

        const found = assets.filter(
            x => x.admin === args.admin &&
                 x.id === args.id
        );

        return found.length === 1 ? found[0] : null;
    }

    async getLedgerEnd(): Promise<number> {
        const response = await this.ledgerProvider.request<Ops.GetV2StateLedgerEnd>({
            method: "ledgerApi",
            params: {
                resource: "/v2/state/ledger-end",
                requestMethod: "get",
            },
        });

        return response.offset ?? 0;
    }
}
