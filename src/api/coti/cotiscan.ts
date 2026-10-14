import { ethers } from "@coti-io/coti-ethers";
import { z } from "zod";
import { TransactionInfo } from "../common";
import { assert } from "../errors";
import { EtherScanHistory } from "../evm/providers/etherscan";
import { default as IPrivateERC20 } from "./abi/IPrivateERC20.json";


///////////////////////////////////////////////////////////////////////////////
const LogsSchema = z.object({
    status: z.string(),
    message: z.string(),
    result: z.object({
        address: z.string(),
        data: z.string(),
        timeStamp: z.coerce.number().int().positive(),
        topics: z.string().nullable().array(),
        transactionHash: z.string(),
    }).array(),
});


///////////////////////////////////////////////////////////////////////////////
export class CotiScanHistory extends EtherScanHistory {

    protected readonly _privateTokenInterface: ethers.Interface;

    constructor(args: {
        baseUrl: string,
        txUrlFormatter: (id: string) => string,
    }) {
        super(args);
        this._privateTokenInterface = new ethers.Interface(IPrivateERC20.abi);
    }

    async getPrivateTokenTransactions(args: {
        token: string,
        owner: string,
        tokenDecimals: number,
    }): Promise<TransactionInfo[]> {
        const outTxs = await this._doGetPrivateTokenTxs({
            ...args,
            direction: "out",
        });

        const inTxs = await this._doGetPrivateTokenTxs({
            ...args,
            direction: "in",
        });

        return [ ...outTxs, ...inTxs ].sort((a, b) => b.timestamp - a.timestamp);
    }

    protected async _doGetPrivateTokenTxs(args: {
        token: string,
        owner: string,
        direction: "in" | "out",
        tokenDecimals: number,
    }): Promise<TransactionInfo[]> {
        const otherTopicNo = args.direction === "out" ? 1 : 2;
        const fragment = this._privateTokenInterface.getEvent("Transfer");
        assert(fragment);

        const data = await this._client.getTyped({
            schema: LogsSchema,
            params: {
                module: "logs",
                action: "getLogs",
                address: args.token,
                fromBlock: "0",
                toBlock: "99999999",
                topic0: fragment.topicHash,
                [`topic${otherTopicNo}`]: ethers.zeroPadValue(args.owner, 32),
                [`topic0_${otherTopicNo}_opr`]: "and",
                page: "1",
                offset: this.MAX_TRANSACTIONS.toString(),
            },
        });

        if( data.status !== "1" ) {
            return [];
        }

        const result: TransactionInfo[] = [];
        for( const item of data.result ) {
            const decoded = this._privateTokenInterface.decodeEventLog(
                fragment,
                item.data,
                item.topics.filter(x => !!x) as string[]
            );

            result.push({
                id: item.transactionHash,
                direction: args.direction,
                confirmed: true,
                success: true,
                timestamp: item.timeStamp,
                scannerUrl: this._txUrlFormatter(item.transactionHash),
                amount: ethers.formatUnits(args.direction === "out" ? decoded[2] : decoded[3], args.tokenDecimals),
            });
        }

        return result;
    }
}
