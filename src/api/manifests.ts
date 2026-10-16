import { z } from "zod";

export const TokenSchema = z.object({
    address: z.string(),
    name: z.string().optional(),
    symbol: z.string().optional(),
    decimals: z.number().nonnegative().optional(),
    ticker: z.string().optional(),
    icon: z.string().url().optional(),
});

export const TokenManifestSchema = z.object({
    version: z.number().int().positive(),
    tokens: z.array(TokenSchema),
});

const BlockchainBaseManifestSchema = z.object({
    version: z.number().int().positive(),
    name: z.string(),

    priceProvider: z.object({
        type: z.string(),
        blockchain: z.string(),
        url: z.string().url(),
    }),

    nativeToken: z.object({
        name: z.string(),
        symbol: z.string(),
        ticker: z.string().optional(),
        icon: z.string().url().optional(),
        address: z.string().optional(),
    }),

    tokens: z.object({
        mandatory: z.union([
            z.array(z.string()),
            z.array(TokenSchema),
        ]).optional(),

        all: z.union([
            z.string().url(),
            z.array(TokenSchema),
        ]).optional(),
    }).optional(),

    blockExplorer: z.object({
        transaction: z.string(),
    }),
});

const BlockchainExtraSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("bitcoin"),
        apiBaseUrl: z.string().url(),
        network: z.string(),
    }),
    z.object({
        type: z.literal("evm"),
        chainId: z.number(),
        rpcUrl: z.string().url(),
        scannerApiUrl: z.union([
            z.string().url(),
            z.object({
                type: z.literal("tatum"),
                chain: z.string(),
                baseUrl: z.string().url(),
            }),
        ]),
        multicallAddress: z.string().optional(),
    }),
    z.object({
        type: z.literal("canton"),
        authServerUrl: z.string().url(),
        ledgerUrl: z.string().url(),
        validatorUrl: z.string().url(),
        registries: z.string().url().array(),
    }),
    z.object({
        type: z.literal("coti"),
        chainId: z.number(),
        rpcUrl: z.string().url(),
        scannerApiUrl: z.string().url(),
    }),
    z.object({
        type: z.literal("solana"),
        rpcUrl: z.string().url(),
        rpcWsUrl: z.string().url().optional(),
        scannerApiUrl: z.string().url().optional(),
    }),
    z.object({
        type: z.literal("tron"),
        rpcUrl: z.string().url(),
        scannerApiHost: z.string().url(),
        multicallAddress: z.string().optional(),
    }),
    z.object({
        type: z.literal("ton"),
        apiBaseUrl: z.string().url(),
    }),
    z.object({
        type: z.literal("venom"),
        rpcUrl: z.string().url(),
    }),
    z.object({
        type: z.literal("xrpl"),
        rpcUrl: z.string().url(),
    }),
]);

export const BlockchainManifestSchema = z.intersection(
    BlockchainBaseManifestSchema,
    BlockchainExtraSchema
);
