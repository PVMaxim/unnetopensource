import { ethers } from "@coti-io/coti-ethers";
import { default as IPrivateERC20 } from "./abi/IPrivateERC20.json";
import { default as IERC20 } from "@uniswap/v2-core/build/IERC20.json";
import { CardKeys, Request, Token, TransactionInfo } from "../common";
import { UniError, UniLowBalanceError } from "../errors";
import { BasicTokenMetadata, GenericTokenBase } from "../token-base";
import { parseNumberOrFail, LazyValue, toBlockchainUnits, fromBlockchainUnits } from "../utils";
import { CotiCore } from "./core";
import { CotiSecureUint64 } from "./secure";

const SECURE_ERC20_TRANSFER_GAS_USAGE = BigInt(525_000);

export class CotiErc20Token extends GenericTokenBase implements Token {

    private readonly _core: CotiCore;
    private readonly _erc20: ethers.Contract;
    private readonly _privateErc20: ethers.Contract;
    private readonly _address: string;
    private readonly _isSecureToken: LazyValue<boolean>;

    constructor(args: {
        core: CotiCore,
        address: string,
        ticker: LazyValue<string | undefined>,
        name?: string,
        symbol?: string,
        decimals?: number,
        isMandatory?: boolean,
    }) {
        super({
            ...args,
            id: args.address.toLowerCase(),
            priceProvider: args.core.priceProvider,
        });

        this._core = args.core;
        this._address = args.address;
        this._erc20 = new ethers.Contract(args.address, IERC20.abi, args.core.provider);
        this._privateErc20 = new ethers.Contract(args.address, IPrivateERC20.abi, args.core.provider);

        this._isSecureToken = new LazyValue(async () => {
            const contract = new ethers.Contract(this._address, IPrivateERC20.abi, this._core.provider);

            try {
                await contract.accountEncryptionAddress(this._address);
            } catch(e: any) {
                if( e.code === "CALL_EXCEPTION" || e.code === "BAD_DATA" ) {
                    return false;
                }
            }

            return true;
        });
    }

    static async checkTokenOnChain(args: {
        provider: ethers.Provider,
        address: string,
    }): Promise<boolean> {
        const contract = new ethers.Contract(args.address, IERC20.abi, args.provider);

        try {
            await contract.name();
            await contract.symbol();
            await contract.decimals();
        }
        catch(e: any) {
            if( e.code === "BAD_DATA" ) {
                return false;
            } else {
                throw e;
            }
        }

        return true;
    }

    isSecure(): Promise<boolean> {
        return this._isSecureToken.get();
    }

    async getBalance(owner: string): Promise<string> {
        if( !ethers.isAddress(owner) ) {
            return "0";
        }

        const balance = await this._doGetBalance(owner);
        if( balance === BigInt(0) ) {
            return "0";
        }

        const decimals = await this.getDecimals();
        return fromBlockchainUnits(balance, decimals);
    }

    async getTransactions(args: {
        owner: string,
        limit: number,
        offset?: number,
    }): Promise<{
        total: number,
        items: TransactionInfo[],
    }> {
        if( !ethers.isAddress(args.owner) ) {
            return { total: 0, items: [] };
        }

        const decimals = await this.getDecimals();
        const offset = args.offset ?? 0;
        let total: number;
        let items: TransactionInfo[];

        if( await this._isSecureToken.get() ) {
            const allItems = await this._core.history.getPrivateTokenTransactions({
                token: this._address,
                owner: args.owner,
                tokenDecimals: decimals,
            });

            total = allItems.length;
            items = allItems.slice(offset, offset + args.limit);

            if( items.length > 0 ) {
                if( await this._core.isOnBoarded(args.owner) ) {
                    for( const item of items ) {
                        item.amount = fromBlockchainUnits(
                            await this._core.decryptValue(
                                args.owner,
                                toBlockchainUnits(item.amount, decimals)
                            ),
                            decimals
                        );
                    }
                } else {
                    items.forEach(x => {
                        x.amount = "0";
                    })
                }
            }

        } else {
            const allItems = await this._core.history.getTokenTransactions({
                token: this._address,
                owner: args.owner,
            });

            total = allItems.length;
            items = allItems.slice(offset, offset + args.limit);
        }

        return { total, items };
    }

    async transfer(args: {
        recipient: string,
        amount: number | string,
        keys?: CardKeys,
    }): Promise<Request> {
        if( !ethers.isAddress(args.recipient) ) {
            throw new UniError("INVALID_ARGUMENT", `Invalid address : ${args.recipient}`);
        }

        const sender = this._core.getWalletAddress(args.keys);
        if( args.recipient.toLowerCase() === sender.toLowerCase() ) {
            throw new UniError("SAME_SENDER_AND_RECIPIENT");
        }

        const decimals = await this.getAndVerifyDecimals();
        const amount = toBlockchainUnits(args.amount, decimals);

        const balance = await this._doGetBalance(sender, true);
        if( amount > balance ) {
            throw new UniLowBalanceError(this.id);
        }

        if( await this._isSecureToken.get() ) {
            return this._core.callContract({
                contract: {
                    interface: this._privateErc20.interface,
                    address: this._address,
                    method: "transfer(address,(uint256,bytes))",
                    params: [
                        args.recipient,
                        new CotiSecureUint64(amount),
                    ],
                },
                estimatedGas: SECURE_ERC20_TRANSFER_GAS_USAGE,
                keys: args.keys!,
            });
        } else {
            return this._core.callContract({
                contract: {
                    interface: this._erc20.interface,
                    address: this._address,
                    method: "transfer",
                    params: [
                        args.recipient,
                        amount,
                    ],
                },
                keys: args.keys!,
            });
        }
    }

    getAddress(): string {
        return this._address;
    }

    protected async _doGetBalance(owner: string, failIfNeedOnboarding?: boolean): Promise<bigint> {
        let balance: bigint = await this._erc20.balanceOf(owner);

        if( (await this._isSecureToken.get()) && balance !== BigInt(0) ) {
            if( (await this._core.isOnBoarded(owner)) || failIfNeedOnboarding ) {
                balance = await this._core.decryptValue(owner, balance);
            } else {
                balance = BigInt(0);
            }
        }

        return balance;
    }

    protected async _doGetMetadata(): Promise<BasicTokenMetadata> {
        const name = await this._erc20.name();
        const symbol = await this._erc20.symbol();
        const decimals = parseNumberOrFail(await this._erc20.decimals());

        return { name, symbol, decimals };
    }
}
