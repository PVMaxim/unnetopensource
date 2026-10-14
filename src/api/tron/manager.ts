import { z } from "zod";
import { formatUnits } from "ethers";
import { TronWeb } from "tronweb";
import { CardKeys, Token, BlockchainManager, TokenMetadataInput, TokenTransactionInfo } from "../common";
import { BalanceReader, BatchEvmBalanceReader } from "../evm/balance-reader";
import { UniError } from "../errors";
import { HttpClient } from "../http-client";
import { BlockchainManagerBase } from "../manager-base";
import { PriceProvider } from "../pricing";
import { getSecp256k1Key } from "../utils";
import { BasicTronBalanceReader } from "./balance-reader";
import { TronMulticall } from "./multicall";
import { TronNativeCoin } from "./native-coin";
import { calcTronAddress, TRON_NATIVE_TOKEN_DECIMALS } from "./request";
import { Trc20Token } from "./trc20-token";


///////////////////////////////////////////////////////////////////////////////
export const Trc20TransfersSchema2 = z.object({
    total: z.number(),
    token_transfers: z.object({
        transaction_id: z.string(),
        block_ts: z.number(),
        from_address: z.string(),
        to_address: z.string(),
        quant: z.coerce.bigint(),
        confirmed: z.boolean(),
        finalResult: z.string(),
        tokenInfo: z.object({
            tokenId: z.string(),
            tokenDecimal: z.number().nonnegative(),
        }),
    }).array(),
});


///////////////////////////////////////////////////////////////////////////////
export class TronManager extends BlockchainManagerBase implements BlockchainManager {

    readonly type = "tron";
    readonly nativeCoin: Token;
    readonly provider: TronWeb;

    private readonly _scannerApi: HttpClient;
    private readonly _txUrlFormatter: (id: string) => string;
    private readonly _balanceReader: BalanceReader;

    constructor(args: {
        rpcUrl: string,
        scannerApiHost: string,
        nativeToken: {
            name: string,
            symbol: string,
            ticker?: string,
        },
        txUrlFormatter: (id: string) => string,
        priceProvider: PriceProvider,
        tokenManifest?: string | TokenMetadataInput[],
        multicallAddress?: string,
    }) {
        super({
            priceProvider: args.priceProvider,
            tokenManifest: args.tokenManifest,
        });

        this.provider = new TronWeb({
            fullHost: args.rpcUrl,
            privateKey: "01",
        });

        this._scannerApi = new HttpClient({baseUrl: args.scannerApiHost});
        this._txUrlFormatter = args.txUrlFormatter;

        if( args.multicallAddress ) {
            this._balanceReader = new BatchEvmBalanceReader(new TronMulticall(this.provider, args.multicallAddress));
        } else {
            this._balanceReader = new BasicTronBalanceReader(this.provider);
        }

        this.nativeCoin = new TronNativeCoin({
            provider: this.provider,
            scannerApi: this._scannerApi,
            formatTxUrl: args.txUrlFormatter,
            priceProvider: args.priceProvider,
            balanceReader: this._balanceReader,
            decimals: TRON_NATIVE_TOKEN_DECIMALS,
            ...args.nativeToken,
        });

        this.addToken(this.nativeCoin);
    }

    async getWalletAddress(keys: CardKeys): Promise<string> {
        return calcTronAddress(getSecp256k1Key(keys));
    }

    isValidAddress(address: string): boolean {
        return TronWeb.isAddress(address);
    }

    protected _normalizeAddress(address: string): string {
        return address;
    }

    protected _createToken(metadata: TokenMetadataInput): Token {
        return new Trc20Token({
            ...metadata,
            provider: this.provider,
            formatTxUrl: this._txUrlFormatter,
            scannerApi: this._scannerApi,
            priceProvider: this._priceProvider,
            balanceReader: this._balanceReader,
            ticker: this._getLazyTicker(metadata),
        });
    }

    protected _checkTokenOnChain(address: string): Promise<boolean> {
        return Trc20Token.checkTokenOnChain({
            provider: this.provider,
            address,
        });
    }

    async getTransactionStatus(txHash: string): Promise<number> {
        const retries = 30; // Retry for up to 30 seconds
        for (let i = 0; i < retries; i++) {
            const txInfo =  await this.provider.trx.getTransactionInfo(txHash).catch(() => null);

            if (!txInfo || Object.keys(txInfo).length === 0) {
                // Transaction not yet confirmed
                await new Promise(r => setTimeout(r, 2000));
                continue;
            }

            const result = txInfo?.receipt?.result;
            if (result === 'SUCCESS') {
                return 1;
            } else {
                const reasonHex = txInfo?.resMessage || '';
                const reason = reasonHex ? this.provider.toUtf8(reasonHex) : 'Unknown error';
                throw new UniError("INTERNAL_ERROR",`Transaction failed: ${reason}`);
            }
        }

        throw new UniError("INTERNAL_ERROR", 'Transaction not confirmed within timeout');
    }

    async getEstimatedCost({ tronRouterAddrees, functionName, options, parameter, fromAddress }: {
        tronRouterAddrees: string, functionName: string, options: any, parameter: any, fromAddress: string
    }) {
        const { energy_used } = await this.provider.transactionBuilder.triggerConstantContract(
            tronRouterAddrees,
            functionName,
            options,
            parameter,
            this.provider.address.fromHex(fromAddress)
        );

        if(!energy_used){
            throw new UniError("INTERNAL_ERROR", "Energy used is not defined");
        }

        const params = await this.provider.trx.getChainParameters();
        const energyPriceParam = params.find(p => p.key === "getEnergyFee");
        const bandwidthPriceParam = params.find(p => p.key === "getTransactionFee");

        if(!energyPriceParam || !bandwidthPriceParam){
            throw new UniError("INTERNAL_ERROR", "Energy or Bandwidth price is not defined");
        }

        const energyPriceTRX = (energyPriceParam.value * energy_used) / 1_000_000;

        const bandwidthPriceSUN = bandwidthPriceParam.value;

        const { transaction } = await this.provider.transactionBuilder.triggerSmartContract(
            tronRouterAddrees,
            functionName,
            options,
            parameter,
            this.provider.address.fromHex(fromAddress)
        );
        const txSize = Buffer.byteLength(transaction.raw_data_hex, 'hex');
        const SIGNATURE_SIZE = 67;
        const estimatedFeeTRX = ((txSize + SIGNATURE_SIZE) * bandwidthPriceSUN) / 1_000_000;
        return energyPriceTRX + estimatedFeeTRX;
    }

    async getTransactions(args: {
        owner: string,
        limit: number,
        offset?: number,
    }): Promise<{
        total: number,
        items: TokenTransactionInfo[],
    }> {
        if( !TronWeb.isAddress(args.owner) ) {
            return { total: 0, items: [] };
        }

        const allowedTokens: string[] = [];
        for( const token of this._tokens.values() ) {
            allowedTokens.push(token.id);
        }

        const tokenTxs = await this._getAllTokenTransactions(args.owner);
        const nativeTxs = (await this.nativeCoin.getTransactions({
            owner: args.owner,
            limit: 50,
        })).items;

        const allTxs: TokenTransactionInfo[] = [
            ...tokenTxs.filter(x => allowedTokens.includes(x.tokenId)),
            ...nativeTxs.map(x => ({ ...x, tokenId: "_" })),
        ].sort((a, b) => b.timestamp - a.timestamp);

        const offset = args.offset ?? 0;
        return {
            total: allTxs.length,
            items: allTxs.slice(offset, offset + args.limit),
        };
    }

    async _getAllTokenTransactions(owner: string): Promise<TokenTransactionInfo[]> {
        const maxTxs = 50;

        const data = await this._scannerApi.getTyped({
            schema: Trc20TransfersSchema2,
            url: "api/token_trc20/transfers",
            params: {
                start: "0",
                limit: maxTxs.toString(),
                relatedAddress: owner,
            },
        });

        return data.token_transfers
            .map(x => ({
                id: x.transaction_id,
                tokenId: x.tokenInfo.tokenId,
                success: x.finalResult === "SUCCESS",
                confirmed: true,
                direction: (x.from_address.toLowerCase() === owner.toLowerCase()) ? "out" : "in",
                timestamp: ~~(x.block_ts / 1000),
                amount: formatUnits(x.quant, x.tokenInfo.tokenDecimal),
                scannerUrl: this._txUrlFormatter(x.transaction_id),
            }));
    }
}
