import { ethers } from "ethers";
import { TronWeb, utils } from "tronweb";
import { UniError } from "../errors";
import { Multicall, MulticallCall, MulticallCallResult } from "../evm/multicall";


/////////////////////////////////////////////////////////////////////////////
export class TronMulticall implements Multicall {

    readonly provider: TronWeb;
    readonly address: string;
    private readonly _interface: ethers.Interface;

    constructor(provider: TronWeb, address: string) {
        this.provider = provider;
        this.address = address;
        this._interface = new ethers.Interface(TRON_MULTICALL_ABI);
    }

    buildGetEthBalance(owner: string): MulticallCall {
        return {
            target: this.address,
            interface: this._interface,
            fnName: "getEthBalance",
            fnArgs: [owner],
        };
    }

    buildGetBlockNumber(): MulticallCall {
        return {
            target: this.address,
            interface: this._interface,
            fnName: "getBlockNumber",
        };
    }

    async execute(calls: MulticallCall[]): Promise<MulticallCallResult[]> {
        const rawParameter = this._interface._encodeParams(
            this._interface.getFunction("aggregate3")?.inputs!,
            [
                calls.map(x => ({
                    target: this._addressToHex(x.target),
                    allowFailure: true,
                    callData: this._encodeFnArgs(x.interface, x.fnName, x.fnArgs),
                }))
            ],
        );

        const options = {
            from: this.provider.defaultAddress.hex,
            rawParameter,
        };

        const dryRunTx = await this.provider.transactionBuilder.triggerConstantContract(
            this.address,
            "aggregate3((address,bool,bytes)[])",
            options,
            [],
            options.from ? this.provider.address.toHex(options.from) : undefined,
        );

        const results = (utils.abi.decodeParamsV2ByABI(AGGREGATE3_ABI, "0x" + dryRunTx.constant_result![0]) as any).returnData;

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

    private _addressToHex(src: string): string {
        return "0x" + TronWeb.address.toHex(src).slice(2);
    }

    private _encodeFnArgs(iface: ethers.Interface, fnName: string, fnArgs?: any[]) {
        const fragment = iface.getFunction(fnName);
        if( !fragment ) {
            throw new UniError("INTERNAL_ERROR", `Function not found : ${fnName}`);
        }

        if( fnArgs ) {
            fnArgs = fnArgs.map((x, i) => {
                if( fragment.inputs[i].type === "address" ) {
                    return this._addressToHex(x);
                } else {
                    return x;
                }
            });
        }

        return iface.encodeFunctionData(fragment, fnArgs ?? []);
    }
}


///////////////////////////////////////////////////////////////////////////////
const AGGREGATE3_ABI = {
    "inputs": [
        {
            "components": [
                {
                    "internalType": "address",
                    "name": "target",
                    "type": "address"
                },
                {
                    "internalType": "bool",
                    "name": "allowFailure",
                    "type": "bool"
                },
                {
                    "internalType": "bytes",
                    "name": "callData",
                    "type": "bytes"
                }
            ],
            "internalType": "struct Multicall3.Call3[]",
            "name": "calls",
            "type": "tuple[]"
        }
    ],
    "name": "aggregate3",
    "outputs": [
        {
            "components": [
                {
                    "internalType": "bool",
                    "name": "success",
                    "type": "bool"
                },
                {
                    "internalType": "bytes",
                    "name": "returnData",
                    "type": "bytes"
                }
            ],
            "internalType": "struct Multicall3.Result[]",
            "name": "returnData",
            "type": "tuple[]"
        }
    ],
    "stateMutability": "view",
    "type": "function"
};

const TRON_MULTICALL_ABI = [
    {
        "inputs": [],
        "name": "getBlockNumber",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "blockNumber",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "addr",
                "type": "address"
            }
        ],
        "name": "getEthBalance",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "balance",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    AGGREGATE3_ABI,
];
