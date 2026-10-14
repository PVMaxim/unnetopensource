import {
    createAssociatedTokenAccountInstruction,
    getAccount,
    getAssociatedTokenAddressSync,
    getMint,
    getTokenMetadata,
    createTransferCheckedInstruction,
    Account,
    TokenAccountNotFoundError,
    TokenInvalidAccountOwnerError,
    TOKEN_2022_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

import { Connection, PublicKey, TransactionInstruction } from "@solana/web3.js";
import { AccountNotFoundError } from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { fetchDigitalAsset, mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { fromWeb3JsPublicKey } from '@metaplex-foundation/umi-web3js-adapters';

import { CardKeys, Request, Token, TransactionInfo } from "../common";
import { UniError } from "../errors";
import { PriceProvider } from "../pricing";
import { BasicTokenMetadata, GenericTokenBase } from "../token-base";
import { getEd25519Key, LazyValue, toBlockchainUnits } from "../utils";
import { SolanaCore, solanaPublicKeyFromHex } from "./core";


///////////////////////////////////////////////////////////////////////////////
interface SplTokenMetadata extends BasicTokenMetadata {
    programId: PublicKey;
}

interface TokenNameMetadata {
    name: string;
    symbol: string;
}


///////////////////////////////////////////////////////////////////////////////
export class SplToken extends GenericTokenBase<SplTokenMetadata> implements Token {

    private readonly _core: SolanaCore;
    private readonly _mint: PublicKey;
    private readonly _associatedAccounts: Map<string, LazyValue<PublicKey>>;
    private readonly _address: string;

    constructor(args: {
        core: SolanaCore,
        priceProvider: PriceProvider,
        address: string,
        ticker: LazyValue<string | undefined>,
        name?: string,
        symbol?: string,
        decimals?: number,
        isMandatory?: boolean,
    }) {
        super({
            ...args,
            id: args.address,
        });

        this._core = args.core;
        this._mint = new PublicKey(args.address);
        this._associatedAccounts = new Map();
        this._address = args.address;
    }

    static async checkTokenOnChain(args: {
        core: SolanaCore,
        address: string,
    }) {
        let mint: PublicKey;
        try {
            mint = new PublicKey(args.address);
        } catch(error) {
            return false;
        }

        return !!(await getSolanaTokenMetadata(args.core.rpc, mint));
    }

    async getBalance(owner: string): Promise<string> {
        let ownerPublicKey: PublicKey;
        try {
            ownerPublicKey = new PublicKey(owner);
        } catch(error) {
            return "0";
        }

        return this._core.splBalanceReader.getBalance(this._mint, ownerPublicKey);
    }

    async getTransactions(args: {
        owner: string,
        limit: number,
        offset?: number,
    }): Promise<{
        total: number,
        items: TransactionInfo[],
    }> {
        if( !this._core.scannerApiClient || !this._core.isValidAddress(args.owner) ) {
            return { total: 0, items: [] };
        }

        return this._core.scannerApiClient.getTransactions({
            token: this._address,
            ...args,
        });
    }

    async transfer(args: {
        recipient: string,
        amount: number | string,
        keys?: CardKeys,
    }): Promise<Request> {
        const senderPubKey = solanaPublicKeyFromHex(this._core.getPublicKey(args.keys));
        const recipientPubKey = new PublicKey(args.recipient);

        if( senderPubKey.equals(recipientPubKey) ) {
            throw new UniError("SAME_SENDER_AND_RECIPIENT");
        }

        const senderATA = await this.getAssociatedAccount(senderPubKey);
        const recipientATA = await this.getAssociatedAccount(recipientPubKey);

        const decimals = await this.getAndVerifyDecimals();
        const amount = toBlockchainUnits(args.amount, decimals);
        const balance = await this._core.rpc.getTokenAccountBalance(senderATA);

        if( amount > BigInt(balance.value.amount) ) {
            throw new UniError("LOW_BALANCE", this.id);
        }

        const recipientAtaExists = await this.associatedAccountExists({
            associatedAccount: recipientATA,
            owner: recipientPubKey,
        });

        const programId = await this.getProgramId();
        const instructions: TransactionInstruction[] = [];

        if( !recipientAtaExists ) {
            instructions.push(
                createAssociatedTokenAccountInstruction(
                    senderPubKey,
                    recipientATA,
                    recipientPubKey,
                    this._mint,
                    programId,
                ),
            );
        }

        instructions.push(
            createTransferCheckedInstruction(
                senderATA,
                this._mint,
                recipientATA,
                senderPubKey,
                amount,
                decimals,
                undefined,
                programId,
            )
        );

        return this._core.createRequest({
            instructions,
            senderPublicKey: getEd25519Key(args.keys),
        });
    }

    swap(args: {
        to: string,
        tx: TransactionInstruction[],
        value: string,
        keys: CardKeys,
    }): Promise<Request> {
        let instructions = args.tx
        instructions.forEach((item) => {
            item.keys.forEach((list) => {
                list.pubkey = new PublicKey(list.pubkey)
            })
        })

        return this._core.createRequest({
            instructions,
            senderPublicKey: getEd25519Key(args.keys),
        });
    }

    async getProgramId(): Promise<PublicKey> {
        return (await this._getMetadata()).programId;
    }

    async getAssociatedAccount(owner: PublicKey): Promise<PublicKey> {
        const metadata = await this._getMetadata();
        const key = owner.toString();
        let lazyATA = this._associatedAccounts.get(key);

        if( !lazyATA ) {
            lazyATA = new LazyValue(async () => {
                return getAssociatedTokenAddressSync(
                    this._mint,
                    owner,
                    false,  // disable off-curve, todo: check this
                    metadata.programId,
                );
            });

            this._associatedAccounts.set(key, lazyATA);
        }

        return lazyATA.get();
    }

    async associatedAccountExists(args: {
        associatedAccount: PublicKey,
        owner: PublicKey,
    }): Promise<boolean> {
        const metadata = await this._getMetadata();
        let account: Account;

        try {
            account = await getAccount(this._core.rpc, args.associatedAccount, undefined, metadata.programId);
        } catch (error: unknown) {
            // TokenAccountNotFoundError can be possible if the associated address has already received some lamports,
            // becoming a system account. Assuming program derived addressing is safe, this is the only case for the
            // TokenInvalidAccountOwnerError in this code path.
            // See @spl-token/src/actions/getOrCreateAssociatedTokenAccount.ts
            if (error instanceof TokenAccountNotFoundError || error instanceof TokenInvalidAccountOwnerError) {
                return false;
            } else {
                throw error;
            }
        }

        if( !account.mint.equals(this._mint) ||
            !account.owner.equals(args.owner)
        ) {
            throw new UniError("INTERNAL_ERROR", `Invalid token account : ${args.associatedAccount.toString()}`);
        }

        return true;
    }

    protected async _doGetMetadata(): Promise<SplTokenMetadata> {
        const metadata = await getSolanaTokenMetadata(this._core.rpc, this._mint);
        if( !metadata ) {
            throw new UniError("INTERNAL_ERROR", `Invalid token : ${this._mint.toString()}`);
        }

        return metadata;
    }

    getAddress(): string {
        return this._address;
    }
}


///////////////////////////////////////////////////////////////////////////////
async function getSolanaTokenMetadata(
    rpc: Connection,
    mint: PublicKey,
): Promise<SplTokenMetadata | undefined> {
    const accountInfo = await rpc.getAccountInfo(mint);

    if( accountInfo ) {
        const isLegacy = accountInfo.owner.equals(TOKEN_PROGRAM_ID);
        const is2022 = accountInfo.owner.equals(TOKEN_2022_PROGRAM_ID);

        if( isLegacy || is2022 ) {
            const mintInfo = await getMint(rpc, mint, undefined, accountInfo.owner);
            const nameMeta = await getTokenNameMetadata(rpc, mint, is2022);

            return {
                name: nameMeta?.name ?? "<UNKNOWN>",
                symbol: nameMeta?.symbol ?? "<UNKNOWN>",
                decimals: mintInfo.decimals,
                programId: accountInfo.owner,
            };
        }
    }

    return undefined;
}

///////////////////////////////////////////////////////////////////////////////
async function getTokenNameMetadata(
    rpc: Connection,
    mint: PublicKey,
    is2022: boolean,
): Promise<TokenNameMetadata | undefined> {
    let nameMeta: TokenNameMetadata | undefined;

    if( is2022 ) {
        const meta2022 = await getTokenMetadata(rpc, mint);
        if( meta2022 ) {
            nameMeta = {
                name: meta2022.name,
                symbol: meta2022.symbol,
            };
        }
    }

    if( !nameMeta ) {
        nameMeta = await getMplTokenMetadata(rpc, mint);
    }

    return nameMeta;
}

///////////////////////////////////////////////////////////////////////////////
async function getMplTokenMetadata(
    rpc: Connection,
    mint: PublicKey,
): Promise<TokenNameMetadata | undefined> {
    const umi = createUmi(rpc);
    umi.use(mplTokenMetadata());

    try {
        const asset = await fetchDigitalAsset(umi, fromWeb3JsPublicKey(mint));
        return {
            name: asset.metadata.name,
            symbol: asset.metadata.symbol,
        };
    } catch(error: unknown) {
        if( error instanceof AccountNotFoundError ) {
            return undefined;
        } else {
            throw error;
        }
    }
}