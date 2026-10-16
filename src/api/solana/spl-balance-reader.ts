import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { CachedValue } from "../utils";

export class SplBalanceReader {

    private readonly MAX_CACHE_AGE = 5 * 1000;
    private readonly _rpc: Connection;
    private readonly _cache: Map<string, CachedValue<Map<string, string>>>;

    constructor(rpc: Connection) {
        this._rpc = rpc;
        this._cache = new Map();
    }

    async getBalance(mint: PublicKey, owner: PublicKey): Promise<string> {
        const ownerStr = owner.toString();
        let cachedBalances = this._cache.get(ownerStr);

        if( !cachedBalances ) {
            cachedBalances = new CachedValue(() => this._getBalances(owner), this.MAX_CACHE_AGE);
            this._cache.set(ownerStr, cachedBalances);
        }

        const balances = await cachedBalances.get();
        return balances.get(mint.toString()) ?? "0";
    }

    private async _getBalances(owner: PublicKey): Promise<Map<string, string>> {
        const balances = new Map<string, string>();
        await this._getProgramBalances(owner, TOKEN_PROGRAM_ID, balances);
        await this._getProgramBalances(owner, TOKEN_2022_PROGRAM_ID, balances);
        return balances;
    }

    private async _getProgramBalances(
        owner: PublicKey,
        programId: PublicKey,
        balances: Map<string, string>,
    ): Promise<void> {
        const response = await this._rpc.getParsedTokenAccountsByOwner(owner, { programId });

        for( const item of response.value ) {
            const mint: string | undefined = item.account.data.parsed.info?.mint;
            const amount: string | undefined = item.account.data.parsed.info?.tokenAmount?.uiAmountString;

            if( mint && amount ) {
                balances.set(mint, amount);
            }
        }
    }
}
