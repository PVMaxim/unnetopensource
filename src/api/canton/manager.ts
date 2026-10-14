import {
    TRANSFER_INSTRUCTION_INTERFACE_ID,
    TransferInstructionView,
    InstrumentId,
} from "@canton-network/core-token-standard";

import {
    BlockchainManager,
    CardKeys,
    Request,
    Token,
    TokenMetadataInput,
    TokenTransactionInfo, TransactionInfo,
} from "../common";

import { UniError } from "../errors";
import { BlockchainManagerBase } from "../manager-base";
import { PriceProvider } from "../pricing";
import { CantonCore, CantonAsset } from "./core";
import { CantonStandardToken } from "./standard-token";
import { CantonUserManager } from "./user-manager";
import { MintingDelegationManager } from "./minting-delegation";
import { TransferPreapprovalManager } from "./transfer-preapproval";
import { initUnifiedWorkerAuth } from "../worker-auth";
import { CantonHistoryReader } from "./history";
import { HttpClient } from "../http-client";
import { z } from "zod";
import { LazyValue } from "../utils";


///////////////////////////////////////////////////////////////////////////////
// <instrument-admin>|<instrument-id>|<transfer-id>
function parsePendingTransferId(src: string) {
    const parts = src.split("|");
    if( parts.length === 3 && parts.every(x => x.length > 0) ) {
        return {
            instrumentId: {
                admin: parts[0],
                id: parts[1],
            },
            transferCid: parts[2],
        };
    }

    throw new UniError("INVALID_ARGUMENT", `Invalid transfer id : ${src}`);
}

function buildPendingTransferId(args: {
    instrument: InstrumentId,
    transferCid: string,
}) {
    return `${args.instrument.admin}|${args.instrument.id}|${args.transferCid}`;
}


///////////////////////////////////////////////////////////////////////////////
export class CantonManager extends BlockchainManagerBase implements BlockchainManager {

    readonly type = "canton";
    readonly nativeCoin: Token;

    private readonly _ledgerUrl: string;
    private readonly _validatorUrl: string;
    private readonly _registries: string[];
    private readonly _txUrlFormatter: (id: string) => string;
    private readonly _userManager: CantonUserManager;
    private readonly _mintingDelegationManager: MintingDelegationManager;
    private readonly _preapprovalManager: TransferPreapprovalManager;
    private readonly _tokenByInstrument: Map<string, Token>;

    private _primaryCard?: CardKeys;
    private _cachedCore?: CantonCore;

    constructor(args: {
        authServerUrl: string,
        ledgerUrl: string,
        validatorUrl: string,
        registries: string[],
        nativeToken: {
            address: string,
            name: string,
            symbol: string,
            ticker?: string,
        },
        txUrlFormatter: (id: string) => string,
        priceProvider: PriceProvider,
        tokenManifest?: string | TokenMetadataInput[],
    }) {
        super({
            priceProvider: args.priceProvider,
            tokenManifest: args.tokenManifest,
        });

        initUnifiedWorkerAuth();

        this._ledgerUrl = args.ledgerUrl;
        this._validatorUrl = args.validatorUrl;
        this._registries = args.registries;
        this._txUrlFormatter = args.txUrlFormatter;
        this._userManager = new CantonUserManager(args);
        this._tokenByInstrument = new Map();

        this.nativeCoin = new CantonStandardToken({
            coreFactory: () => this.getCore(),
            txUrlFormatter: this._txUrlFormatter,
            isNative: true,
            priceProvider: args.priceProvider,
            instrument: args.nativeToken.address,
            ...args.nativeToken,
        });

        this._mintingDelegationManager = new MintingDelegationManager({
            coreFactory: () => this._getCoreInternal(),
            dso: (this.nativeCoin as CantonStandardToken).instrument.admin,
        });

        this._preapprovalManager = new TransferPreapprovalManager({
            coreFactory: () => this._getCoreInternal(),
            dso: (this.nativeCoin as CantonStandardToken).instrument.admin,
        });

        this.addToken(this.nativeCoin);

        if( !args.tokenManifest ) {
            this._lazyTokenManifest = new LazyValue(async () => {
                const assets = await this.getRegistryAssets();
                const items: TokenMetadataInput[] = assets.map(a => ({
                    address: `${a.admin}|${a.id}`,
                    name: a.displayName !== a.id ? `${a.displayName} (${a.id})` : a.displayName,
                    symbol: a.symbol,
                    ticker: a.id,
                }));
                return {
                    items,
                    byAddress: new Map(items.map(i => [this._normalizeAddress(i.address), i])),
                };
            });
        }
    }

    addToken(token: Token) {
        super.addToken(token);
        const packedId = CantonStandardToken.packInstrumentId((token as CantonStandardToken).instrument);
        this._tokenByInstrument.set(packedId, token);
    }

    setPrimaryCard(keys: CardKeys) {
        this._primaryCard = keys;
        this._cachedCore = undefined;
    }

    async isOnBoarded(): Promise<boolean> {
        const keys = this._primaryCard ?? {};

        if( !(await this._userManager.userExists(keys)) ) {
            return false;
        }

        if( !(await this._preapprovalManager.exists(keys)) ) {
            return false;
        }

        return this._mintingDelegationManager.exists(keys);
    }

    async performOnBoarding(): Promise<Request[]> {
        const keys = this._primaryCard ?? {};
        const steps: Request[] = [];
        const userExists = await this._userManager.userExists(keys);

        let mintingDelegationExists = false;
        let preapprovalExists = false;

        if( userExists ) {
            mintingDelegationExists = await this._mintingDelegationManager.exists(keys);
            preapprovalExists = await this._preapprovalManager.exists(keys);
        } else {
            steps.push(await this._userManager.performOnboarding(keys));
        }

        if( !mintingDelegationExists ) {
            steps.push(this._mintingDelegationManager.create(keys));
        }

        if( !preapprovalExists ) {
            steps.push(this._preapprovalManager.create(keys));
        }

        return steps;
    }

    getWalletAddress(keys: CardKeys): Promise<string> {
        return CantonCore.getWalletAddress(keys);
    }

    isValidAddress(_address: string): boolean {
        return true;
    }

    async getPendingTransfers(keys: CardKeys) {
        const core = await this.getCore();
        const owner = await this.getWalletAddress(keys);

        const pending = await core.tokenStdService.listContractsByInterface<TransferInstructionView>(
            TRANSFER_INSTRUCTION_INTERFACE_ID,
            owner,
        );

        const result = [];
        for( const item of pending ) {
            const token = this._tokenByInstrument.get(
                CantonStandardToken.packInstrumentId(item.interfaceViewValue.transfer.instrumentId)
            );

            if( item.interfaceViewValue.status.tag === "TransferPendingReceiverAcceptance" &&
                item.interfaceViewValue.transfer.receiver === owner &&
                Date.parse(item.interfaceViewValue.transfer.executeBefore) > Date.now() &&
                token
            ) {
                result.push({
                    id: buildPendingTransferId({
                        instrument: item.interfaceViewValue.transfer.instrumentId,
                        transferCid: item.contractId,
                    }),
                    tokenId: token.id,
                    sender: item.interfaceViewValue.transfer.sender,
                    amount: item.interfaceViewValue.transfer.amount,
                });
            }
        }

        return result;
    }

    async acceptTransfer(args: {
        id: string,
        keys: CardKeys,
    }) {
        const core = await this.getCore();
        const transferParams = parsePendingTransferId(args.id);
        const assetInfo = await this._findAssetOrFail(transferParams.instrumentId);

        const [ExerciseCommand, disclosedContracts] =
            await core.tokenStdService.transfer.createAcceptTransferInstruction(
                transferParams.transferCid,
                assetInfo.registryUrl,
            );

        return core.createLedgerRequest({
            commands: [{ ExerciseCommand }],
            disclosedContracts,
            keys: args.keys,
        });
    }

    async rejectTransfer(args: {
        id: string,
        keys: CardKeys,
    }) {
        const core = await this.getCore();
        const transferParams = parsePendingTransferId(args.id);
        const assetInfo = await this._findAssetOrFail(transferParams.instrumentId);

        const [ExerciseCommand, disclosedContracts] =
            await core.tokenStdService.transfer.createRejectTransferInstruction(
                transferParams.transferCid,
                assetInfo.registryUrl,
            );

        return core.createLedgerRequest({
            commands: [{ ExerciseCommand }],
            disclosedContracts,
            keys: args.keys,
        });
    }

    async getTransactions(args: {
        owner: string,
        limit: number,
        offset?: number,
    }): Promise<{
        total: number,
        items: TokenTransactionInfo[],
    }> {
        const core = await this.getCore();
        const reader = new CantonHistoryReader({
            core,
            party: args.owner,
            nativeInstrumentId: CantonStandardToken.packInstrumentId((this.nativeCoin as any).instrument),
            txLinkFormatter: this._txUrlFormatter,
        });

        const allItems: TokenTransactionInfo[] = await reader.getTransactions();

        const offset = args.offset ?? 0;
        return {
            total: allItems.length,
            items: allItems.slice(offset, offset + args.limit),
        };
    }

    protected override _isValidTokenAddress(address: string): boolean {
        return CantonStandardToken.unpackInstrumentId(address) !== null;
    }

    protected override _normalizeAddress(address: string): string {
        const nativeAddress = CantonStandardToken.packInstrumentId((this.nativeCoin as CantonStandardToken).instrument);
        if( address === nativeAddress ) {
            return "_";
        }
        return address;
    }

    private _publicRegistryAssets?: LazyValue<CantonAsset[]>;

    async getRegistryAssets(): Promise<CantonAsset[]> {
        if (!this._publicRegistryAssets) {
            this._publicRegistryAssets = new LazyValue(async () => {
                const results: CantonAsset[] = [];
                for (const registryUrl of this._registries) {
                    try {
                        const normalizedUrl = registryUrl.replace(/\/+$/, "") + "/";
                        const client = new HttpClient({ baseUrl: normalizedUrl });
                        const info = await client.getTyped({
                            schema: z.object({ adminId: z.string() }).passthrough(),
                            url: "registry/metadata/v1/info",
                        });
                        const data = await client.getTyped({
                            schema: z.object({
                                instruments: z.array(z.object({
                                    id: z.string(),
                                    name: z.string(),
                                    symbol: z.string(),
                                }).passthrough()),
                            }).passthrough(),
                            url: "registry/metadata/v1/instruments",
                        });
                        for (const item of data.instruments) {
                            results.push({
                                id: item.id,
                                displayName: item.name,
                                symbol: item.symbol,
                                registryUrl,
                                admin: info.adminId,
                            });
                        }
                    } catch (e) {
                        // ignore unreachable or misconfigured registries
                    }
                }
                return results;
            });
        }
        return this._publicRegistryAssets.get();
    }

    async findAsset(instrument: InstrumentId): Promise<CantonAsset | null> {
        const assets = await this.getRegistryAssets();
        const found = assets.filter(
            x => x.admin === instrument.admin && x.id === instrument.id
        );
        return found.length === 1 ? found[0] : null;
    }

    protected _createToken(metadata: TokenMetadataInput): Token {
        return new CantonStandardToken({
            ...metadata,
            instrument: metadata.address,
            coreFactory: () => this.getCore(),
            txUrlFormatter: this._txUrlFormatter,
            priceProvider: this._priceProvider,
        });
    }

    protected async _checkTokenOnChain(address: string): Promise<boolean> {
        const instrument = CantonStandardToken.unpackInstrumentId(address);
        if( !instrument ) {
            return false;
        }

        const assetInfo = await this.findAsset(instrument).catch(() => null);
        return !!assetInfo;
    }

    private async _getCoreInternal(): Promise<CantonCore> {
        if( this._cachedCore ) {
            return this._cachedCore;
        }

        if( !this._primaryCard ) {
            throw new UniError("INTERNAL_ERROR", "Primary card not initialized");
        }

        if( !(await this._userManager.userExists(this._primaryCard)) ) {
            throw new UniError("INTERNAL_ERROR", "Card user is not onboarded");
        }

        this._cachedCore = new CantonCore({
            userManager: this._userManager,
            ledgerUrl: this._ledgerUrl,
            validatorUrl: this._validatorUrl,
            registries: this._registries,
            keys: this._primaryCard,
        });

        return this._cachedCore;
    }

    async getCore(): Promise<CantonCore> {
        const core = await this._getCoreInternal();

        if( !(await this.isOnBoarded()) ) {
            throw new UniError("INTERNAL_ERROR", "Card user is not onboarded");
        }

        return core;
    }

    private async _findAssetOrFail(instrument: InstrumentId) {
        const core = await this.getCore();
        const asset = await core.findAsset(instrument);
        const packedId = CantonStandardToken.packInstrumentId(instrument);

        // to mitigate security issues token should be present in our token list
        if( !asset || !this._tokenByInstrument.has(packedId) ) {
            throw new UniError(
                "INVALID_ARGUMENT",
                `Asset not found : id=${instrument.id} admin=${instrument.admin}`
            );
        }

        return asset;
    }
}
