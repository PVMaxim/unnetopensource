export const WVenomVaultABI = {
    "ABI version": 2,
    "data": [
        {
            "key": 1,
            "name": "root_",
            "type": "address"
        },
        {
            "key": 2,
            "name": "owner_",
            "type": "address"
        }
    ],
    "events": [],
    "fields": [
        {
            "name": "_pubkey",
            "type": "uint256"
        },
        {
            "name": "_timestamp",
            "type": "uint64"
        },
        {
            "name": "_constructorFlag",
            "type": "bool"
        },
        {
            "name": "root_",
            "type": "address"
        },
        {
            "name": "owner_",
            "type": "address"
        },
        {
            "name": "balance_",
            "type": "uint128"
        },
        {
            "name": "version_",
            "type": "uint32"
        },
        {
            "name": "platformCode_",
            "type": "cell"
        }
    ],
    "functions": [
        {
            "inputs": [],
            "name": "constructor",
            "outputs": []
        },
        {
            "inputs": [
                {
                    "name": "answerId",
                    "type": "uint32"
                },
                {
                    "name": "interfaceID",
                    "type": "uint32"
                }
            ],
            "name": "supportsInterface",
            "outputs": [
                {
                    "name": "value0",
                    "type": "bool"
                }
            ]
        },
        {
            "inputs": [
                {
                    "name": "answerId",
                    "type": "uint32"
                }
            ],
            "name": "specialWalletOwners",
            "outputs": [
                {
                    "name": "value0",
                    "type": "address[]"
                }
            ]
        },
        {
            "inputs": [
                {
                    "name": "answerId",
                    "type": "uint32"
                }
            ],
            "name": "platformCode",
            "outputs": [
                {
                    "name": "value0",
                    "type": "cell"
                }
            ]
        },
        {
            "id": "0x15A038FB",
            "inputs": [
                {
                    "name": "value0",
                    "type": "cell"
                },
                {
                    "name": "value1",
                    "type": "uint32"
                },
                {
                    "name": "sender",
                    "type": "address"
                },
                {
                    "name": "remainingGasTo",
                    "type": "address"
                }
            ],
            "name": "onDeployRetry",
            "outputs": []
        },
        {
            "inputs": [
                {
                    "name": "answerId",
                    "type": "uint32"
                }
            ],
            "name": "version",
            "outputs": [
                {
                    "name": "value0",
                    "type": "uint32"
                }
            ]
        },
        {
            "inputs": [
                {
                    "name": "remainingGasTo",
                    "type": "address"
                }
            ],
            "name": "upgrade",
            "outputs": []
        },
        {
            "inputs": [
                {
                    "name": "newCode",
                    "type": "cell"
                },
                {
                    "name": "newVersion",
                    "type": "uint32"
                },
                {
                    "name": "remainingGasTo",
                    "type": "address"
                }
            ],
            "name": "acceptUpgrade",
            "outputs": []
        },
        {
            "id": "0x4384F298",
            "inputs": [
                {
                    "name": "amount",
                    "type": "uint128"
                },
                {
                    "name": "remainingGasTo",
                    "type": "address"
                },
                {
                    "name": "notify",
                    "type": "bool"
                },
                {
                    "name": "payload",
                    "type": "cell"
                }
            ],
            "name": "acceptMint",
            "outputs": []
        },
        {
            "inputs": [
                {
                    "name": "amount",
                    "type": "uint128"
                },
                {
                    "name": "recipient",
                    "type": "address"
                },
                {
                    "name": "deployWalletValue",
                    "type": "uint128"
                },
                {
                    "name": "remainingGasTo",
                    "type": "address"
                },
                {
                    "name": "notify",
                    "type": "bool"
                },
                {
                    "name": "payload",
                    "type": "cell"
                }
            ],
            "name": "transfer",
            "outputs": []
        },
        {
            "inputs": [
                {
                    "name": "amount",
                    "type": "uint128"
                },
                {
                    "name": "deployWalletValue",
                    "type": "uint128"
                },
                {
                    "name": "remainingGasTo",
                    "type": "address"
                },
                {
                    "name": "payload",
                    "type": "cell"
                }
            ],
            "name": "acceptNative",
            "outputs": []
        },
        {
            "id": "0x67A0B95F",
            "inputs": [
                {
                    "name": "amount",
                    "type": "uint128"
                },
                {
                    "name": "sender",
                    "type": "address"
                },
                {
                    "name": "remainingGasTo",
                    "type": "address"
                },
                {
                    "name": "notify",
                    "type": "bool"
                },
                {
                    "name": "payload",
                    "type": "cell"
                }
            ],
            "name": "acceptTransfer",
            "outputs": []
        },
        {
            "inputs": [
                {
                    "name": "amount",
                    "type": "uint128"
                },
                {
                    "name": "remainingGasTo",
                    "type": "address"
                },
                {
                    "name": "callbackTo",
                    "type": "address"
                },
                {
                    "name": "payload",
                    "type": "cell"
                }
            ],
            "name": "burnByRoot",
            "outputs": []
        },
        {
            "inputs": [
                {
                    "name": "remainingGasTo",
                    "type": "address"
                }
            ],
            "name": "destroy",
            "outputs": []
        },
        {
            "inputs": [
                {
                    "name": "amount",
                    "type": "uint128"
                },
                {
                    "name": "remainingGasTo",
                    "type": "address"
                },
                {
                    "name": "callbackTo",
                    "type": "address"
                },
                {
                    "name": "payload",
                    "type": "cell"
                }
            ],
            "name": "burn",
            "outputs": []
        },
        {
            "inputs": [
                {
                    "name": "answerId",
                    "type": "uint32"
                }
            ],
            "name": "balance",
            "outputs": [
                {
                    "name": "value0",
                    "type": "uint128"
                }
            ]
        },
        {
            "inputs": [
                {
                    "name": "answerId",
                    "type": "uint32"
                }
            ],
            "name": "owner",
            "outputs": [
                {
                    "name": "value0",
                    "type": "address"
                }
            ]
        },
        {
            "inputs": [
                {
                    "name": "answerId",
                    "type": "uint32"
                }
            ],
            "name": "root",
            "outputs": [
                {
                    "name": "value0",
                    "type": "address"
                }
            ]
        },
        {
            "inputs": [
                {
                    "name": "answerId",
                    "type": "uint32"
                }
            ],
            "name": "walletCode",
            "outputs": [
                {
                    "name": "value0",
                    "type": "cell"
                }
            ]
        },
        {
            "inputs": [
                {
                    "name": "amount",
                    "type": "uint128"
                },
                {
                    "name": "recipientTokenWallet",
                    "type": "address"
                },
                {
                    "name": "remainingGasTo",
                    "type": "address"
                },
                {
                    "name": "notify",
                    "type": "bool"
                },
                {
                    "name": "payload",
                    "type": "cell"
                }
            ],
            "name": "transferToWallet",
            "outputs": []
        },
        {
            "inputs": [
                {
                    "name": "to",
                    "type": "address"
                }
            ],
            "name": "sendSurplusGas",
            "outputs": []
        }
    ],
    "header": [
        "pubkey",
        "time",
        "expire"
    ],
    "version": "2.2"
} as const;