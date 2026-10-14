export const CardWalletABI = {
	"ABI version": 2,
	"version": "2.2",
	"header": ["pubkey", "time", "expire"],
	"functions": [
		{
			"name": "constructor",
			"inputs": [
				{"name":"transactionLifeTime","type":"uint64"},
				{"name":"postMsgBody","type":"optional(cell)"}
			],
			"outputs": [
			]
		},
		{
			"name": "getVersion",
			"inputs": [
				{"name":"answerId","type":"uint32"}
			],
			"outputs": [
				{"name":"value0","type":"uint32"}
			]
		},
		{
			"name": "setTransactionLifeTime",
			"inputs": [
				{"name":"lifeTime","type":"uint64"}
			],
			"outputs": [
			]
		},
		{
			"name": "getTransactionLifeTime",
			"inputs": [
				{"name":"answerId","type":"uint32"}
			],
			"outputs": [
				{"name":"value0","type":"uint64"}
			]
		},
		{
			"name": "sendTransaction",
			"inputs": [
				{"name":"dest","type":"address"},
				{"name":"value","type":"uint128"},
				{"name":"bounce","type":"bool"},
				{"name":"flags","type":"uint8"},
				{"name":"payload","type":"cell"}
			],
			"outputs": [
			]
		},
		{
			"name": "sendTransactionsWithSign",
			"inputs": [
				{"components":[{"name":"timestamp","type":"uint64"},{"components":[{"name":"recipient","type":"address"},{"name":"value","type":"uint128"},{"name":"bounce","type":"bool"},{"name":"flags","type":"uint8"},{"name":"payload","type":"cell"}],"name":"transfers","type":"tuple[]"}],"name":"data","type":"tuple"},
				{"components":[{"name":"highPart","type":"uint256"},{"name":"lowPart","type":"uint256"},{"name":"pubkey","type":"uint256"}],"name":"signature","type":"tuple"}
			],
			"outputs": [
			]
		},
		{
			"name": "sendTokensWithSign",
			"inputs": [
				{"components":[{"name":"timestamp","type":"uint64"},{"components":[{"name":"tokenRoot","type":"address"},{"name":"amount","type":"uint128"},{"name":"recipient","type":"address"},{"name":"deployWalletValue","type":"uint128"},{"name":"remainingGasTo","type":"address"},{"name":"notify","type":"bool"},{"name":"payload","type":"cell"},{"name":"value","type":"uint128"}],"name":"tokenTransfers","type":"tuple[]"}],"name":"data","type":"tuple"},
				{"components":[{"name":"highPart","type":"uint256"},{"name":"lowPart","type":"uint256"},{"name":"pubkey","type":"uint256"}],"name":"signature","type":"tuple"}
			],
			"outputs": [
			]
		},
		{
			"name": "onTokenWallet",
			"inputs": [
				{"name":"wallet","type":"address"}
			],
			"outputs": [
			]
		},
		{
			"name": "upgrade",
			"inputs": [
				{"name":"code","type":"cell"}
			],
			"outputs": [
			]
		}
	],
	"data": [
	],
	"events": [
	],
	"fields": [
		{"name":"_pubkey","type":"uint256"},
		{"name":"_timestamp","type":"uint64"},
		{"name":"_constructorFlag","type":"bool"},
		{"name":"m_ownerKey","type":"uint256"},
		{"name":"m_transactions","type":"map(uint256,uint64)"},
		{"name":"m_tokenWallets","type":"map(address,address)"},
		{"components":[{"name":"amount","type":"uint128"},{"name":"recipient","type":"address"},{"name":"deployWalletValue","type":"uint128"},{"name":"remainingGasTo","type":"address"},{"name":"notify","type":"bool"},{"name":"payload","type":"cell"}],"name":"m_queuedTokenTransfers","type":"map(address,tuple[])"},
		{"name":"m_transactionLifeTime","type":"uint64"}
	]
} as const;

export const CardWalletTvc = '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';
