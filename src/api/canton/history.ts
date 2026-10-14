import { BigNumber } from "bignumber.js";
import { z } from "zod";
import { Ops } from "@canton-network/core-provider-ledger";
import { HOLDING_INTERFACE_ID } from "@canton-network/core-token-standard";
import { matchInterfaceIds } from "@canton-network/core-tx-parser";
import { type LedgerCommonSchemas } from "@canton-network/core-ledger-client-types";
import { TokenTransactionInfo } from "../common";
import { CantonCore } from "./core";


///////////////////////////////////////////////////////////////////////////////
type JsTransaction = LedgerCommonSchemas["JsTransaction"];
type CreatedEvent = LedgerCommonSchemas["CreatedEvent"];
type ExercisedEvent = LedgerCommonSchemas["ExercisedEvent"];


///////////////////////////////////////////////////////////////////////////////
const HoldingInterfaceViewSpec = z.object({
    owner: z.string(),
    instrumentId: z.object({
        admin: z.string(),
        id: z.string(),
    }),
    amount: z.string(),
});


///////////////////////////////////////////////////////////////////////////////
// Enhanced Ledger Updates History Reader
// - Pagination & offset tracking (nextOffset, afterOffset, beforeOffset)
// - Sorting newest-first
// - Extracting transfer details directly from choiceArgument when contract
//   was created outside current chunk boundary (avoids failing /v2/events/events-by-contract-id)
// - Filtering out internal MergeSplit / Lock net-zero transactions
///////////////////////////////////////////////////////////////////////////////
export class CantonHistoryReader {

    private readonly _core: CantonCore;
    private readonly _party: string;
    private readonly _nativeInstrumentId: string;
    private readonly _txLinkFormatter: (id: string) => string;
    readonly _activeHoldings: Map<string, Map<string, string>>;
    private _nextOffset?: number;

    constructor(args: {
        core: CantonCore,
        party: string,
        txLinkFormatter: (id: string) => string,
        nativeInstrumentId: string,
    }) {
        this._core = args.core;
        this._party = args.party;
        this._nativeInstrumentId = args.nativeInstrumentId;
        this._txLinkFormatter = args.txLinkFormatter;
        this._activeHoldings = new Map();
    }

    get nextOffset(): number | undefined {
        return this._nextOffset;
    }

    async getTransactions(args?: {
        afterOffset?: number,
        beforeOffset?: number,
        limit?: number,
    }): Promise<TokenTransactionInfo[]> {
        const beginExclusive = args?.afterOffset ?? 0;
        const endInclusive = args?.beforeOffset ?? await this._core.getLedgerEnd();
        const limit = args?.limit ?? 100;

        const updates = await this._getUpdatesChunk({
            beginExclusive,
            endInclusive,
            limit,
        });

        const history: TokenTransactionInfo[] = [];

        for (const update of updates) {
            // Track nextOffset from OffsetCheckpoint or Transaction offset
            if (update.update && "OffsetCheckpoint" in update.update && (update.update as any).OffsetCheckpoint?.value?.offset !== undefined) {
                const cpOffset = (update.update as any).OffsetCheckpoint.value.offset;
                this._nextOffset = Math.max(this._nextOffset ?? 0, cpOffset);
            }

            if (update.update && "Transaction" in update.update) {
                const tx = update.update.Transaction.value;
                if (tx.offset !== undefined) {
                    this._nextOffset = Math.max(this._nextOffset ?? 0, tx.offset);
                }
                this._processTransaction(tx, history);
            }
        }

        // Sort newest first
        history.sort((a, b) => b.timestamp - a.timestamp);
        return history;
    }

    private _processTransaction(tx: JsTransaction, history: TokenTransactionInfo[]) {
        const mergedHoldings = new Map<string, BigNumber>();

        // 1. Process CreatedEvents and ExercisedEvents (existing raw logic)
        for (const event of tx.events) {
            if ("CreatedEvent" in event) {
                this._processCreatedEvent(event.CreatedEvent, mergedHoldings);
            }
            else if ("ExercisedEvent" in event) {
                this._processExercisedEvent(event.ExercisedEvent, mergedHoldings);
            }
        }

        // 2. if an outgoing or incoming transfer contract wasn't in _activeHoldings
        // (e.g. crossing chunk boundaries during pagination), extract directly from choiceArgument.transfer
        if (mergedHoldings.size === 0) {
            for (const event of tx.events) {
                if ("ExercisedEvent" in event) {
                    const ex = event.ExercisedEvent;
                    const choiceArg = ex.choiceArgument as any;
                    const transfer = choiceArg?.transfer;
                    if (transfer && typeof transfer === "object") {
                        const rawInstrumentId = transfer.instrumentId
                            ? `${transfer.instrumentId.admin}|${transfer.instrumentId.id}`
                            : this._nativeInstrumentId;
                        const tokenId = rawInstrumentId === this._nativeInstrumentId ? "_" : rawInstrumentId;
                        const amt = transfer.amount ? BigNumber(transfer.amount).abs() : BigNumber(0);

                        if (!amt.isZero() && !amt.isNaN()) {
                            if (transfer.sender === this._party) {
                                mergedHoldings.set(tokenId, (mergedHoldings.get(tokenId) ?? BigNumber(0)).minus(amt));
                            } else if (transfer.receiver === this._party) {
                                mergedHoldings.set(tokenId, (mergedHoldings.get(tokenId) ?? BigNumber(0)).plus(amt));
                            }
                        }
                    }
                }
            }
        }

        const txTime = tx.recordTime ? Math.floor(Date.parse(tx.recordTime) / 1000) : Math.floor(Date.now() / 1000);
        const timestamp = isNaN(txTime) ? Math.floor(Date.now() / 1000) : txTime;

        for (const [instrumentId, amount] of mergedHoldings.entries()) {
            if (amount.isZero()) {
                // Ignore MergeSplit or net-zero internal transfers
                continue;
            }

            const scannerUrl = this._txLinkFormatter ? this._txLinkFormatter(tx.updateId) : "";
            history.push({
                id: tx.updateId,
                tokenId: instrumentId,
                success: true,
                confirmed: true,
                direction: amount.isPositive() ? "in" : "out",
                amount: amount.abs().toFixed(),
                timestamp,
                scannerUrl,
            });
        }
    }

    private _processCreatedEvent(event: CreatedEvent, mergedHoldings: Map<string, BigNumber>) {
        const holdings = this._extractHoldings(event.interfaceViews ?? []);
        if (holdings.size > 0) {
            this._activeHoldings.set(event.contractId, holdings);

            for (const [instrumentId, amount] of holdings.entries()) {
                mergedHoldings.set(instrumentId, (mergedHoldings.get(instrumentId) ?? BigNumber(0)).plus(amount));
            }
        }
    }

    private _processExercisedEvent(event: ExercisedEvent, mergedHoldings: Map<string, BigNumber>) {
        const holdings = this._activeHoldings.get(event.contractId);
        if (event.consuming && holdings) {
            this._activeHoldings.delete(event.contractId);

            for (const [instrumentId, amount] of holdings.entries()) {
                mergedHoldings.set(instrumentId, (mergedHoldings.get(instrumentId) ?? BigNumber(0)).minus(amount));
            }
        }
    }

    private _extractHoldings(interfaceViews: LedgerCommonSchemas["JsInterfaceView"][]): Map<string, string> {
        const holdings = new Map<string, string>();
        for (const view of (interfaceViews ?? [])) {
            if (view.viewStatus.code ||
                !view.viewValue ||
                !matchInterfaceIds(view.interfaceId, HOLDING_INTERFACE_ID)
            ) {
                continue;
            }

            const holdingValue = HoldingInterfaceViewSpec.safeParse(view.viewValue);
            if (!holdingValue.success ||
                holdingValue.data.owner !== this._party
            ) {
                continue;
            }

            const instrumentId = `${holdingValue.data.instrumentId.admin}|${holdingValue.data.instrumentId.id}`;
            holdings.set(instrumentId !== this._nativeInstrumentId ? instrumentId : "_", holdingValue.data.amount);
        }

        return holdings;
    }

    async _getUpdatesChunk(args: {
        beginExclusive: number,
        endInclusive: number,
        limit: number,
    }) {
        return this._core.ledgerProvider.request<Ops.PostV2UpdatesFlats>({
            method: "ledgerApi",
            params: {
                resource: "/v2/updates/flats",
                requestMethod: "post",
                body: {
                    beginExclusive: args.beginExclusive,
                    endInclusive: args.endInclusive,
                    verbose: false,
                    updateFormat: {
                        includeTransactions: {
                            transactionShape: "TRANSACTION_SHAPE_LEDGER_EFFECTS",
                            eventFormat: {
                                verbose: false,
                                filtersByParty: {
                                    [this._party]: {
                                        cumulative: [
                                            {
                                                identifierFilter: {
                                                    InterfaceFilter: {
                                                        value: {
                                                            interfaceId: HOLDING_INTERFACE_ID,
                                                            includeInterfaceView: true,
                                                            includeCreatedEventBlob: false,
                                                        },
                                                    },
                                                },
                                            },
                                        ],
                                    }
                                },
                            },
                        },
                    },
                },
                query: {
                    limit: args.limit,
                },
            },
        });
    }
}
