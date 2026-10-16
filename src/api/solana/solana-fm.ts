import { z } from "zod";
import { TransactionInfo } from "../common";
import { UniError } from "../errors";
import { HttpClient } from "../http-client";
import {BigNumber} from "bignumber.js";

const InstructionSchema = z.object({
    instructionIndex: z.number(),
    innerInstructionIndex: z.number(),
    action: z.string(),
    status: z.string(),
    source: z.string().nullish(),
    sourceAssociation: z.string().nullish(),
    destination: z.string().nullish(),
    destinationAssociation: z.string().nullish(),
    token: z.string(),
    amount: z.coerce.bigint().nonnegative(),
    timestamp: z.number(),
});

const TransfersSchema = z.object({
    status: z.string(),
    message: z.string(),
    results: z.object({
        transactionHash: z.string(),
        data: z.array(InstructionSchema),
    }).array(),
    pagination: z.object({
        currentPage: z.number(),
        totalPages: z.number(),
    }),
});

const TokenInfoSchema = z.object({
    status: z.string(),
    message: z.string(),
    result: z.object({
        tokenHash: z.string(),
        data: z.object({
            mint: z.string(),
            tokenName: z.string(),
            symbol: z.string(),
            decimals: z.number().int().nonnegative(),
            description: z.string().nullish(),
            logo: z.string().nullish(),
            tags: z.string().array(),
            verified: z.string(),
            network: z.string().array(),
            metadataToken: z.string(),
        }),
    }),
});

export async function getTokenInfo(args: {
    httpClient: HttpClient,
    mint: string,
}): Promise<{name: string, symbol: string} | undefined> {
    const response = await args.httpClient.fetch({
        url: `v0/tokens/${args.mint}`,
        validateStatus: (status: number)=> status === 200 || status === 404,
    });

    if( response.status === 404 ) {
        return undefined;
    }

    const data = await HttpClient.parseTypedResponse({
        response,
        schema: TokenInfoSchema,
    });

    if( data.status !== "Success" ) {
        throw new UniError("SERVER_ERROR", "Invalid server response");
    }

    return {
        name: data.result.data.tokenName,
        symbol: data.result.data.symbol,
    };
}

export async function getTransfers(args: {
    httpClient: HttpClient,
    accountAddress: string,
    decimals: number,
    getTransactionLink: (id: string) => string,
    mint?: string,
}): Promise<TransactionInfo[]> {
    const data = await args.httpClient.getTyped({
        url: `v0/accounts/${args.accountAddress}/transfers`,
        schema: TransfersSchema,
        params: {
            mint: args.mint ?? "",
        },
    });

    if( data.status !== "success" ) {
        throw new UniError("SERVER_ERROR", "Invalid server response");
    }

    const result: TransactionInfo[] = [];
    for( const tx of data.results ) {
        if( tx.data.length === 0 ) {
            continue;
        }

        let amount = BigInt(0);
        for( const instruction of tx.data ) {
            if( instruction.source === args.accountAddress ) {
                amount -= instruction.amount;
            }

            if( instruction.destination === args.accountAddress ) {
                amount += instruction.amount;
            }
        }

        result.push({
            id: tx.transactionHash,
            success: tx.data.every(x => x.status === "Successful"),
            confirmed: true,
            timestamp: tx.data[0].timestamp,
            direction: amount > BigInt(0) ? "in" : "out",
            scannerUrl: args.getTransactionLink(tx.transactionHash),
            amount: new BigNumber(amount.toString()).abs().shiftedBy(-args.decimals).toFixed(),
        });
    }

    return result;
}
