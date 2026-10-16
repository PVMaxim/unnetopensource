import { secp256k1 } from "@noble/curves/secp256k1";
import { TronWeb, Types as TronTypes, utils as tronUtils } from "tronweb";
import { Request } from "../common";
import { EvmRequestChunk } from "../evm/request";
import { assertArgument, UniLowBalanceError } from "../errors";
import { fromBlockchainUnits } from "../utils";

export const TRON_NATIVE_TOKEN_DECIMALS = 6;

export class TronRequest<TxContractType> implements Request {
    readonly chunks: EvmRequestChunk[];

    private readonly _provider: TronWeb;
    private readonly _transaction: TronTypes.Transaction<TxContractType>;
    private readonly _fee: bigint;

    private constructor(args: {
        provider: TronWeb,
        publicKey: string,
        transaction: TronTypes.Transaction<TxContractType>,
        fee: bigint,
    }) {
        this._provider = args.provider;
        this._transaction = args.transaction;
        this._fee = args.fee;

        this.chunks = [
            new EvmRequestChunk({
                hash: this._transaction.txID,
                expectedPublicKey: args.publicKey,
            }),
        ];
    }

    static async create<TxContractType>(args: {
        provider: TronWeb,
        publicKey: string,
        transaction: TronTypes.Transaction<TxContractType>,
        energy?: number,
        nativeAmount?: bigint,
    }) {
        const sender = calcTronAddress(args.publicKey);
        const availableBandwidth = await args.provider.trx.getBandwidth(sender);
        const bandwithToBuy = Math.max(estimateBandwith(args.transaction.raw_data_hex) - availableBandwidth, 0);

        const chainParams = await args.provider.trx.getChainParameters();
        const bandwithPrice = chainParams.filter(item => item.key === "getTransactionFee")[0].value;
        const energyPrice = chainParams.filter(item => item.key === "getEnergyFee")[0].value;
        const fee = BigInt(Math.ceil(bandwithToBuy * bandwithPrice + (args.energy ?? 0) * energyPrice));

        const totalAmount = (args.nativeAmount ?? BigInt(0)) + fee;
        const balance = BigInt(await args.provider.trx.getUnconfirmedBalance(sender));

        if( totalAmount > balance ) {
            throw new UniLowBalanceError("_");
        }

        return new TronRequest({
            ...args,
            fee,
        });
    }

    async estimateFee(): Promise<string> {
        return fromBlockchainUnits(this._fee, TRON_NATIVE_TOKEN_DECIMALS);
    }

    async send(): Promise<string> {
        const signature = this.chunks[0].signature;
        assertArgument(!!signature, "Request is not signed");

        const signedTx = {
            ...this._transaction,
            signature: [signature],
        };

        const result = await this._provider.trx.sendRawTransaction(signedTx as TronTypes.SignedTransaction);
        return result.transaction.txID;
    }
}

export function calcTronAddress(publicKey: string): string {
    const uncompressedPubKey = secp256k1.ProjectivePoint.fromHex(publicKey).toRawBytes(false);
    const addressBytes = tronUtils.crypto.computeAddress(uncompressedPubKey);
    return tronUtils.crypto.getBase58CheckAddress(addressBytes);
}

function estimateBandwith(rawDataHex: string): number {
    let result = Math.ceil(rawDataHex.length / 2);
    result += 3;
    result += 64;
    result += 67;
    return result;
}
