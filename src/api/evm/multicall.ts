import { ethers } from "ethers";
import { UniError } from "../errors";
import { wrapEthersErrors } from "./utils";


///////////////////////////////////////////////////////////////////////////////
export interface MulticallCall {
    target: string,
    interface: ethers.Interface,
    fnName: string,
    fnArgs?: any[],
}

export interface MulticallCallResult {
    success: boolean;
    data: any;
}

export interface Multicall {
    buildGetEthBalance(owner: string): MulticallCall;
    buildGetBlockNumber(): MulticallCall;
    execute(calls: MulticallCall[]): Promise<MulticallCallResult[]>;
}


///////////////////////////////////////////////////////////////////////////////
export class EvmMulticall implements Multicall {

    readonly contract: ethers.Contract;
    readonly address: string;

    constructor(provider: ethers.Provider, address: string) {
        this.contract = new ethers.Contract(address, MulticallABI, provider);
        this.address = address;
    }

    buildGetEthBalance(owner: string): MulticallCall {
        return {
            target: this.address,
            interface: this.contract.interface,
            fnName: "getEthBalance",
            fnArgs: [owner],
        };
    }

    buildGetBlockNumber(): MulticallCall {
        return {
            target: this.address,
            interface: this.contract.interface,
            fnName: "getBlockNumber",
        };
    }

    async execute(calls: MulticallCall[]): Promise<MulticallCallResult[]> {
        const results = await wrapEthersErrors(
            () => this.contract.aggregate3.staticCall(
                calls.map(x => ({
                    target: x.target,
                    allowFailure: true,
                    callData: x.interface.encodeFunctionData(x.fnName, x.fnArgs),
                }))
            )
        );

        if( results.length !== calls.length ) {
            throw new UniError("INTERNAL_ERROR", "Invalid contract result");
        }

        return calls.map((x, i) => {
            if( !results[i].success ) {
                return { success: false, data: undefined };
            }

            try {
                const decoded = x.interface.decodeFunctionResult(x.fnName, results[i].returnData);

                return {
                    success: true,
                    data: decoded.length === 1 ? decoded[0] : decoded,
                };
            } catch(error) {
                throw new UniError("INTERNAL_ERROR", "Invalid contract response");
            }
        });
    }
}


///////////////////////////////////////////////////////////////////////////////
export const MulticallABI = [
    // https://github.com/mds1/multicall
    "function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) payable returns (tuple(bool success, bytes returnData)[] returnData)",
    "function getBlockNumber() view returns (uint256 blockNumber)",
    "function getEthBalance(address addr) view returns (uint256 balance)",
];
