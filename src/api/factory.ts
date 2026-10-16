import { z } from "zod";
import { BlockchainManager, Storage } from "./common";
import { UniError, assert } from "./errors";
import { BlockchainManifestSchema } from "./manifests";
import { PriceProvider } from "./pricing";
import { BitcoinManager } from "./bitcoin/manager";
import { CantonManager } from "./canton/manager";
import { CotiManager } from "./coti/manager";
import { EvmManager } from "./evm/manager";
import { SolanaManager } from "./solana/manager";
import { TonManager } from "./ton/manager";
import { TronManager } from "./tron/manager";
import { VenomWalletManager } from "./venom/manager";
import { XrplManager } from "./xrpl/manager";

export function createPriceProvider(args: {
    type: string,
    blockchain: string,
    url: string,
}): PriceProvider {
    if( args.type === "coingecko" ) {
        return new PriceProvider({
            host: args.url,
            platform: args.blockchain,
        });
    } else {
        throw new UniError("INVALID_ARGUMENT", `Unknown price provider : ${args.type}`);
    }
}

export function createManager(args: {
    manifest: unknown,
    storage?: Storage,
    extraTokens?: string[],
}): BlockchainManager {
    let manifest: z.infer<typeof BlockchainManifestSchema>;
    try {
        manifest = BlockchainManifestSchema.parse(args.manifest);
    } catch (err) {
        throw new UniError("INVALID_ARGUMENT", "Invalid blockchain manifest");
    }

    if( manifest.version !== 1 ) {
        throw new UniError("INVALID_ARGUMENT", "Invalid blockchain manifest");
    }

    const commonArgs = {
        nativeToken: manifest.nativeToken,
        priceProvider: createPriceProvider(manifest.priceProvider),
        txUrlFormatter: (txId: string) => manifest.blockExplorer.transaction.replace("{id}", txId),
        tokenManifest: manifest.tokens?.all,
    };

    let manager: BlockchainManager;
    if( manifest.type === "bitcoin" ) {
        manager = new BitcoinManager({
            ...commonArgs,
            apiBaseUrl: manifest.apiBaseUrl,
            network: manifest.network,
        });
    }
    else if( manifest.type === "canton" ) {
        const address = commonArgs.nativeToken.address;
        assert(!!address);

        manager = new CantonManager({
            ...commonArgs,
            nativeToken: {
                ...commonArgs.nativeToken,
                address,
            },
            authServerUrl: manifest.authServerUrl,
            ledgerUrl: manifest.ledgerUrl,
            validatorUrl: manifest.validatorUrl,
            registries: manifest.registries,
        });
    }
    else if( manifest.type === "coti" ) {
        manager = new CotiManager({
            ...commonArgs,
            chainId: manifest.chainId,
            rpcUrl: manifest.rpcUrl,
            scannerApiUrl: manifest.scannerApiUrl,
            storage: args.storage,
        });
    }
    else if( manifest.type === "evm" ) {
        manager = new EvmManager({
            ...commonArgs,
            chainId: manifest.chainId,
            rpcUrl: manifest.rpcUrl,
            scannerApiUrl: manifest.scannerApiUrl,
            multicallAddress: manifest.multicallAddress,
        });
    }
    else if( manifest.type === "solana" ) {
        manager = new SolanaManager({
            ...commonArgs,
            rpcUrl: manifest.rpcUrl,
            rpcWsUrl: manifest.rpcWsUrl,
            scannerApiUrl: manifest.scannerApiUrl,
        });
    }
    else if( manifest.type === "ton" ) {
        manager = new TonManager({
            ...commonArgs,
            apiBaseUrl: manifest.apiBaseUrl,
        });
    }
    else if( manifest.type === "tron" ) {
        manager = new TronManager({
            ...commonArgs,
            rpcUrl: manifest.rpcUrl,
            scannerApiHost: manifest.scannerApiHost,
            multicallAddress: manifest.multicallAddress,
        });
    }
    else if( manifest.type === "venom" ) {
        manager = new VenomWalletManager({
            ...commonArgs,
            rpcUrl: manifest.rpcUrl,
        });
    }
    else if( manifest.type === "xrpl" ) {
        manager = new XrplManager({
            ...commonArgs,
            rpcUrl: manifest.rpcUrl,
        });
    }
    else {
        throw new UniError("INVALID_ARGUMENT", "Unknown blockchain");
    }

    for( const item of (manifest.tokens?.mandatory ?? []) ) {
        if( typeof item === "string" ) {
            manager.addTokenByMetadata({ address: item, isMandatory: true });
        } else {
            manager.addTokenByMetadata({ ...item, isMandatory: true });
        }
    }

    for( const address of (args.extraTokens ?? []) ) {
        manager.addTokenByMetadata({ address });
    }

    return manager;
}
