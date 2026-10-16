import { ethers } from "@coti-io/coti-ethers";
import { ctString, ctUint, decryptString, decryptUint } from "@coti-io/coti-sdk-typescript";
import { CardKeys, Request, Storage } from "../common";
import { UniError } from "../errors";
import { PriceProvider } from "../pricing";
import { getSecp256k1Key, LazyValue } from "../utils";
import { CotiScanHistory } from "./cotiscan";
import { CotiOnBoardingRequest } from "./onboarding";
import { CotiRequest } from "./secure";

export class CotiCore {

    readonly provider: ethers.Provider;
    readonly priceProvider: PriceProvider;
    readonly history: CotiScanHistory;
    readonly txUrlFormatter: (id: string) => string;
    readonly storage?: Storage;

    private _cachedUserKeys: Map<string, LazyValue<string | undefined>>;

    constructor(args: {
        provider: ethers.Provider,
        priceProvider: PriceProvider,
        history: CotiScanHistory,
        txUrlFormatter: (id: string) => string,
        storage?: Storage,
    }) {
        this.provider = args.provider;
        this.priceProvider = args.priceProvider;
        this.history = args.history;
        this.txUrlFormatter = args.txUrlFormatter;
        this.storage = args.storage;
        this._cachedUserKeys = new Map();
    }

    getWalletAddress(keys?: CardKeys): string {
        const publicKey = getSecp256k1Key(keys);
        return ethers.computeAddress(`0x${publicKey}`);
    }

    async isOnBoarded(walletAddress: string): Promise<boolean> {
        const userKey = await this._doGetUserKey(walletAddress);
        return !!userKey;
    }

    performOnBoarding(keys: CardKeys): Promise<Request> {
        return CotiOnBoardingRequest.create({
            provider: this.provider,
            publicKey: getSecp256k1Key(keys),
            onFinish: async (userKey: string) => {
                const walletAddress = this.getWalletAddress(keys);
                this._cachedUserKeys.set(walletAddress.toLowerCase(), new LazyValue(async () => userKey));

                if( this.storage ) {
                    const network = await this.provider.getNetwork();
                    const storageKey = `${walletAddress.toLowerCase()}/coti/${network.chainId}/userKey`;
                    await this.storage.set(storageKey, userKey);
                }
            },
        });
    }

    decryptValue(walletAddress: string, ciphertext: ctUint): Promise<bigint>;
    decryptValue(walletAddress: string, ciphertext: ctString): Promise<string>;

    async decryptValue(walletAddress: string, ciphertext: ctUint | ctString): Promise<bigint | string> {
        const key = await this._getUserKeyOrFail(walletAddress);

        if( typeof ciphertext === "bigint" ) {
            return decryptUint(ciphertext, key);
        } else {
            return decryptString(ciphertext, key);
        }
    }

    async callContract(args: {
        contract: {
            interface: ethers.Interface,
            address: string,
            method: string,
            params?: any[],
        },
        keys: CardKeys,
        value?: bigint,
        gasLimit?: bigint,
        estimatedGas?: bigint,
    }): Promise<Request> {
        return CotiRequest.create({
            provider: this.provider,
            contract: args.contract,
            publicKey: getSecp256k1Key(args.keys),
            userKey: await this._getUserKeyOrFail(this.getWalletAddress(args.keys)),
            value: args.value,
            gasLimit: args.gasLimit,
            estimatedGas: args.estimatedGas,
        });
    }

    private async _getUserKeyOrFail(walletAddress: string): Promise<string> {
        const userKey = await this._doGetUserKey(walletAddress);
        if( !userKey ) {
            throw new UniError("ONBOARDING_REQUIRED");
        }

        return userKey;
    }

    private async _doGetUserKey(walletAddress: string): Promise<string | undefined> {
        let lazyUserKey = this._cachedUserKeys.get(walletAddress.toLowerCase());

        if( !lazyUserKey ) {
            const network = await this.provider.getNetwork();
            const storageKey = `${walletAddress.toLowerCase()}/coti/${network.chainId}/userKey`;

            lazyUserKey = new LazyValue(async () => this.storage?.get(storageKey));
            this._cachedUserKeys.set(walletAddress.toLowerCase(), lazyUserKey);
        }

        return lazyUserKey.get();
    }
}
