import ecc from "@bitcoinerlab/secp256k1";
import * as bitcoin from "bitcoinjs-lib";
import { CardKeys, Token, BlockchainManager, TokenMetadataInput, TokenTransactionInfo } from "../common";
import { UniError } from "../errors";
import { PriceProvider } from "../pricing";
import { BitcoinNativeCoin } from "./native-coin";


///////////////////////////////////////////////////////////////////////////////
let g_eccInitialized = false;


///////////////////////////////////////////////////////////////////////////////
export class BitcoinManager implements BlockchainManager {

    readonly type = "bitcoin";
    readonly nativeCoin: Token;

    constructor(args: {
        apiBaseUrl: string,
        network: string,
        nativeToken: {
            name: string,
            symbol: string,
            ticker?: string,
        },
        txUrlFormatter: (id: string) => string,
        priceProvider: PriceProvider,
    }) {
        if( !g_eccInitialized ) {
            bitcoin.initEccLib(ecc);
            g_eccInitialized = true;
        }

        let network: bitcoin.Network;
        if( args.network === "mainnet" ) {
            network = bitcoin.networks.bitcoin;
        } else if( args.network === "testnet" ) {
            network = bitcoin.networks.testnet;
        } else if( args.network === "regtest" ) {
            network = bitcoin.networks.regtest;
        } else {
            throw new UniError("INVALID_ARGUMENT", `Unknown network : ${args.network}`);
        }

        this.nativeCoin = new BitcoinNativeCoin({
            apiBaseUrl: args.apiBaseUrl,
            network,
            txUrlFormatter: args.txUrlFormatter,
            priceProvider: args.priceProvider,
            ...args.nativeToken,
        });
    }

    async getWalletAddress(keys: CardKeys): Promise<string> {
        return (this.nativeCoin as BitcoinNativeCoin).getAccountAddress(keys);
    }

    isValidAddress(address: string): boolean {
        return (this.nativeCoin as BitcoinNativeCoin).isValidAddress(address);
    }

    addToken(_token: Token): void {
        throw new UniError("NOT_SUPPORTED");
    }

    addTokenByMetadata(_metadata: TokenMetadataInput) {
        throw new UniError("NOT_SUPPORTED");
    }

    getToken(id: string): Token | undefined {
        return id === this.nativeCoin.id ? this.nativeCoin : undefined;
    }

    getTokens(): Token[] {
        return [this.nativeCoin];
    }

    createToken(_metadata: TokenMetadataInput): Token {
        throw new UniError("NOT_SUPPORTED");
    }

    async findTokens(_text: string): Promise<Token[]> {
        return [];
    }

    async getTransactionStatus(_txHash: string): Promise<number> {
        return 1;
    }

    async getTransactions(args: {
        owner: string,
        limit: number,
        offset?: number,
    }): Promise<{
        total: number,
        items: TokenTransactionInfo[],
    }> {
        const txs = await this.nativeCoin.getTransactions(args);
        return {
            total: txs.total,
            items: txs.items.map(x => ({ ...x, tokenId: "_" })),
        };
    }
}
