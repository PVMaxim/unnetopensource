import { BigNumber } from "bignumber.js";
import { secp256k1 } from "@noble/curves/secp256k1";
import { sha512 } from "@noble/hashes/sha512";
import { hexToBytes } from "@xrplf/isomorphic/utils"
import * as xrpl from "xrpl";
import { Request } from "../common";
import { XrplCore, XRPL_NATIVE_DECIMALS, MIN_XRP_AMOUNT_NO_DST } from "./core";
import { UniError, UniLowBalanceError, UniAmountTooSmallError } from "../errors";
import { Secp256k1RequestChunk } from "../request-chunks";
import { fromBlockchainUnits } from "../utils";

export class XrplRequest implements Request {
    readonly chunks: Secp256k1RequestChunk[];

    private readonly _core: XrplCore;
    private readonly _tx: xrpl.Transaction;

    private constructor(args: {
        core: XrplCore,
        tx: xrpl.Transaction,
        publicKey: string,
    }) {
        this._core = args.core;

        this._tx = { ...args.tx };
        this._tx.SigningPubKey = args.publicKey;
        removeTrailingZeros(this._tx);

        const encodedTx = xrpl.encodeForSigning(this._tx);
        const hash = sha512(hexToBytes(encodedTx)).subarray(0, 32);

        this.chunks = [
            new Secp256k1RequestChunk({
                hash: Buffer.from(hash).toString("hex"),
                expectedPublicKey: args.publicKey,
            })
        ];
    }

    static async create(args: {
        core: XrplCore,
        tx: xrpl.SubmittableTransaction,
        publicKey: string,
        nativeAmount?: bigint,
    }): Promise<XrplRequest> {
        const provider = await args.core.provider.get();
        const tx = await provider.autofill(args.tx);

        const xrpAmount = (args.nativeAmount ?? BigInt(0));
        const fee = BigInt(new BigNumber(tx.Fee ?? "0").toFixed());
        const totalAmount = xrpAmount + fee;

        const sender = xrpl.deriveAddress(args.publicKey);
        const xrpBalance = await args.core.getRawXrpBalance(sender);

        if( xrpBalance < totalAmount ) {
            throw new UniLowBalanceError("_");
        }

        return new XrplRequest({
            core: args.core,
            publicKey: args.publicKey,
            tx,
        });
    }

    async estimateFee(): Promise<string> {
        return fromBlockchainUnits(this._tx.Fee ?? "0", XRPL_NATIVE_DECIMALS);
    }

    async send(): Promise<string> {
        const signature = this.chunks[0].signature;

        if( !signature ) {
            throw new UniError("INVALID_ARGUMENT", "Request is not signed");
        }

        const signedTx = {
            ...this._tx,
            TxnSignature: secp256k1.Signature.fromCompact(signature).normalizeS().toDERHex(true),
        };

        const serialized = xrpl.encode(signedTx);
        const txHash = xrpl.hashes.hashSignedTx(signedTx);

        const client = await this._core.provider.get();
        const response = await client.submitAndWait(serialized);

        if( typeof(response.result.meta) !== "string" &&
            response.result.meta?.TransactionResult !== "tesSUCCESS"
        ) {
            const errorCode = response.result.meta?.TransactionResult ?? "";

            if( ["tecINSUF_RESERVE_LINE", "tecINSUF_RESERVE_OFFER", "tecINSUFF_FEE",
                 "tecINSUFFICIENT_RESERVE", "tecNO_LINE_INSUF_RESERVE", "tecUNFUNDED",
                 "tecUNFUNDED_PAYMENT"].includes(errorCode) ) {
                throw new UniLowBalanceError("_");
            }

            if( errorCode === "tecNO_DST_INSUF_XRP" ) {
                throw new UniAmountTooSmallError(fromBlockchainUnits(MIN_XRP_AMOUNT_NO_DST, XRPL_NATIVE_DECIMALS));
            }

            if( response.result.tx_json.TransactionType === "Payment" &&
                ["tecPATH_PARTIAL", "tecPATH_DRY"].includes(errorCode)
            ) {
                const srcAmount = this._core.parseTxAmount(response.result.tx_json.SendMax ??
                                                           response.result.tx_json.DeliverMax ??
                                                           response.result.tx_json.Amount);

                const dstAmount = this._core.parseTxAmount(response.result.tx_json.DeliverMax ??
                                                           response.result.tx_json.Amount);

                if( srcAmount.tokenId && srcAmount.value ) {
                    const srcTrustLines = await this._core.getTrustLines(response.result.tx_json.Account, true);
                    const srcTrustLine = srcTrustLines.get(srcAmount.tokenId);
                    const srcBalance = new BigNumber(srcTrustLine?.balance ?? "0");

                    if( srcBalance.lt(srcAmount.value) ) {
                        throw new UniLowBalanceError(srcAmount.tokenId);
                    }
                }

                if( dstAmount.tokenId && dstAmount.value ) {
                    const dstTrustLines = await this._core.getTrustLines(response.result.tx_json.Destination, true);
                    const dstTrustLine = dstTrustLines.get(dstAmount.tokenId);
                    const dstLimit = new BigNumber(dstTrustLine?.limit ?? "0");

                    if( dstLimit.lt(dstAmount.value) ) {
                        throw new UniError("LOW_DST_LIMIT");
                    }
                }
            }

            throw new UniError("INTERNAL_ERROR", `Failed to send transaction : error=${errorCode}`);
        }

        return txHash;
    }
}

function removeTrailingZeros(tx: xrpl.Transaction): void {
    if( tx.TransactionType === "Payment" &&
        typeof tx.Amount !== "string" &&
        tx.Amount.value.includes(".") &&
        tx.Amount.value.endsWith("0")
    ) {
        tx.Amount = { ...tx.Amount };
        tx.Amount.value = new BigNumber(tx.Amount.value).toString();
    }
}
