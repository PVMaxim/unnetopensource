type Coin = {
    coinAllCode: string,
    coinCode: string,
    mainNetwork: string,
    contact: string,
    coinDecimal: number,
    noSupportCoin: string,
    isSupportAdvanced: string,
    isSupportMemo: string,
    coinCodeShow: string,
}

type GetQueryCoinsResponse = {
    data: Coin[];
}

type GetBaseInfoParams = {
    depositCoinCode: string,
    receiveCoinCode: string,
    depositCoinAmt: string,
    sourceFlag: string,
}

type GetBaseInfoResponse = {
    data: {
        instantRate: string, 
        depositMin: string,
        depositMax: string,
        minerFee: string,
        receiveCoinFee: string,
        depositCoinFeeRate: number,
        chainFee: string,
        isDiscount: string,
        burnRate: string,
        estimatedTime: number,
        isSupport: boolean,
        isDex: string,
        instantRateOriginal: string,
        noGasDepositMin: string | null,
        noGasDepositMax: string | null,
        supportFrontCallData: boolean,
        supportNoGas: boolean,
    },
}

type CreateOrderParams = {
    depositCoinCode: string,
    receiveCoinCode: string,
    depositCoinAmt: string,
    receiveCoinAmt: string,
    destinationAddr: string,
    refundAddr: string,
    equipmentNo: string,
    sourceType: string,
    sourceFlag: string,
    isNoGas: boolean,
    slippage: string,
}

type CreateOrderResponse = {
    resCode: string,
    resMsg: string,
    data: {
        orderId: string,
        depositCoinCode: string,
        receiveCoinCode: string, 
        depositCoinAmt: string,
        receiveCoinAmt: string,
        receiveSwftAmt: string,
        depositCoinState: string,
        platformAddr: string,
        depositCoinFeeRate: string,
        depositCoinFeeAmt: string,
        swftCoinFeeRate: string,
        orderState: string,
        swftReceiveAddr: string,
        swftCoinState: string,
        refundCoinMinerFee: string,
        refundCoinAmt: string,
        refundSwftAmt: string,
        destinationAddr: string,
        refundAddr: string,
        swftRefundAddr: string,
        choiseFeeType: string,
        detailState: string,
        changeType: string,
        developerId: string,
        transactionId: string,
        refundDepositTxid: string,
        depositTxid: string,
        kycUrl: string,
        dealFinishTime: string | null,
        createTime: string,
        chainFee: string,
        depositFeeRate: string,
        instantRate: string,
        isDiscount: string,
        xrpInfo: string | null,
        burnRate: string,
        noGasTxInfo: string | null,
        txInfo: string | null,
        btcMemo: string | null,
        orderModel: string,
    }
}

type UploadTransactionHashParams = {
    orderId: string,
    depositTxid: string,
}

type GetQueryAllTradeParams = {
    equipmentNo: string,
    sourceType: string,
    pageNo: string,
    pageSize: string,
}

type GetQueryAllTradeResponse = {
    resCode: string,
    resMsg: string,
    data: {
       totalCount: number,
       pageSize: number,
       pageNo: number,
       totalPage: number,
       pageContent: {
            orderId: string,
       }[],
    }
}

type BatchQueryOrderStatRespnse = {
    resCode: string,
    resMsg: string,
    data: {
        orderId: string,
        depositCoinCode: string,
        receiveCoinCode: string,
        depositCoinAmt: string,
        receiveCoinAmt: string,
        orderState: string,
        depositHashExplore: string,
        createTime: string,
        depositTxid: string | null,
        detailState: string,
    }[],
}
export const omniBridgeApi = () =>  {
    const apiUrlPrefix = 'https://omnibridge.proxy.united.network/api';
    const defaultHeaders = { 'Content-Type': 'application/json' };

    const getQueryCoins = async (): Promise<GetQueryCoinsResponse> => {
        const response = await fetch(apiUrlPrefix + '/v1/queryCoinList', {
            method: 'POST',
            headers: defaultHeaders,
            body: JSON.stringify({}),
        });
        return response.json();
    }

    const getBaseInfo = async (params: GetBaseInfoParams, signal: AbortSignal): Promise<GetBaseInfoResponse> => {
        const response = await fetch(apiUrlPrefix + '/v1/getBaseInfo', {
            method: 'POST',
            headers: defaultHeaders,
            body: JSON.stringify(params),
            signal,
        });
        return response.json();
    }

    const createOrder = async (params: CreateOrderParams): Promise<CreateOrderResponse> => {
        const response = await fetch(apiUrlPrefix + '/v2/accountExchange', {
            method: 'POST',
            headers: defaultHeaders,
            body: JSON.stringify(params),
        });
        return response.json();
    }

    const uploadTransactionHash = async (params: UploadTransactionHashParams) => {
        const response = await fetch(apiUrlPrefix + '/v2/modifyTxId', {
            method: 'POST',
            headers: defaultHeaders,
            body: JSON.stringify(params),
        });
        return response.json();
    }

    const queryAllTrade = async (params: GetQueryAllTradeParams): Promise<GetQueryAllTradeResponse> => {
        const response = await fetch(apiUrlPrefix + '/v2/queryAllTrade', {
            method: 'POST',
            headers: defaultHeaders,
            body: JSON.stringify(params),
        });
        return response.json();
    }

    const batchQueryOrderState = async (params: { orderIds: string[] }): Promise<BatchQueryOrderStatRespnse> => {
        const response = await fetch(apiUrlPrefix + '/v2/batchQueryOrderState', {
            method: 'POST',
            headers: defaultHeaders,
            body: JSON.stringify(params),
        });
        return response.json();
    }

    return {
        getQueryCoins,
        getBaseInfo,
        createOrder,
        uploadTransactionHash,
        queryAllTrade,
        batchQueryOrderState,
    }
}