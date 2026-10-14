type ChangellyToken =   {
    name: string;
    ticker: string;
    fullName: string;
    enabled: boolean;
    enabledFrom: boolean;
    enabledTo: boolean;
    fixRateEnabled: boolean;
    payinConfirmations: number;
    addressUrl: string;
    transactionUrl: string;
    image: string;
    fixedTime: number;
    contractAddress?: string;
    protocol: string;
    blockchain: string;
    blockchainPrecision: number;
    cmcId: number;
}

type CreateTransactionResponse = {
    id: string;
    jsonrpc: string;
    result: {
        payinAddress: string;
        id: string;
        payinExtraId?: string;
    }
}

type Transaction = {
    id: string;
    trackUrl: string;
    createdAt: number;
    type: string;
    moneyReceived: number;
    moneySent: number;
    rate: string;
    payinConfirmations: number;
    status: string;
    payTill: null;
    currencyFrom: string;
    currencyTo: string;
    payinAddress: string;
    payinHash: string;
    payoutHashLink: string;
    amountExpectedFrom: string;
    payoutAddress: string;
    payoutExtraIdName: string;
    payoutHash: string;
    amountFrom: string;
    amountTo: string;
    amountExpectedTo: string;
    networkFee: string;
    changellyFee: string;
    apiExtraFee: string;
    totalFee: string;
    canPush: boolean;
    canRefund: boolean; 
}

type GetTransactionsResponse = {
    id: string;
    jsonrpc: string;
    result: Transaction[];
}

export const changellyApi = () =>  {
    const apiUrlPrefix = 'https://changelly.worker.united.network/v2'
    const defaultHeaders = { 'Content-Type': 'application/json' };

    const getCurrencies = async (): Promise<ChangellyToken[]> => {
        const body = {
            "jsonrpc": "2.0",
            "id": "test",
            "method": "getCurrenciesFull",
            "params": {}
        }

        const response = await fetch(apiUrlPrefix, {
            method: 'POST',
            headers: defaultHeaders,
            body: JSON.stringify(body),
        });

        const data = await response.json();
        console.log(data, 'response')
        return data.result;
    }

    const getExchangeAmount = async (args: {fromTicker: string, toTicker: string, amountFrom: string}, signal: AbortSignal) => {
        const body = {
            "jsonrpc": "2.0",
            "id": "test",
            "method": "getExchangeAmount",
            "params": {
                "from": `${args.fromTicker}`,
                "to": `${args.toTicker}`,
                "amountFrom": `${args.amountFrom}`,
            }
        }
        const response = await fetch(apiUrlPrefix, {
            method: 'POST',
            headers: defaultHeaders,
            body: JSON.stringify(body),
            signal,
        });
        return response.json();
    }

    const createTransaction = async (args: {fromTicker: string, toTicker: string, amountFrom: string, toAddress: string, fromAddress: string}): Promise<CreateTransactionResponse> => {
        const body = {
            "jsonrpc": "2.0",
            "id": "test",
            "method": "createTransaction",
            "params": {
                "from": `${args.fromTicker}`,
                "to": `${args.toTicker}`,
                "amountFrom": `${args.amountFrom}`,
                "address": `${args.toAddress}`,
                "refundAddress": `${args.fromAddress}`,
            }
        }
        const response = await fetch(apiUrlPrefix, {
            method: 'POST',
            headers: defaultHeaders,
            body: JSON.stringify(body),
        });
        return response.json();
    }

    const getTransactions = async (args: {addresses: string[], limit: number, offset: number}): Promise<GetTransactionsResponse> => { 
        const body = {
            "jsonrpc": "2.0",
            "id": "test",
            "method": "getTransactions",
            "params": {
                "payoutAddress": args.addresses,
                "limit": args.limit,
                "offset": args.offset,
            }
        }
        const response = await fetch(apiUrlPrefix, {
            method: 'POST',
            headers: defaultHeaders,
            body: JSON.stringify(body),
        });
        return response.json();
    }
     
    return {
      getCurrencies,
      getExchangeAmount,
      createTransaction,
      getTransactions
    }
}