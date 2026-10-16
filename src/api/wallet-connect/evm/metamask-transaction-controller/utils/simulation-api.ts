import { convertHexToDecimal } from '@metamask/controller-utils';
import { type Hex } from '@metamask/utils';

import { SimulationChainNotSupportedError, SimulationError } from '../errors';

const RPC_METHOD = 'infura_simulateTransactions';
const BASE_URL = 'https://tx-sentinel-{0}.api.cx.metamask.io/';
const ENDPOINT_NETWORKS = 'networks';

export type SimulationRequestTransaction = {
  data?: Hex;

  from: Hex;

  gas?: Hex;

  maxFeePerGas?: Hex;

  maxPriorityFeePerGas?: Hex;

  to?: Hex;

  value?: Hex;
};

export type SimulationRequest = {
  transactions: SimulationRequestTransaction[];

  blockOverrides?: {
    time?: Hex;
  };

  overrides?: {
    [address: Hex]: {
      stateDiff: {
        [slot: Hex]: Hex;
      };
    };
  };

  withCallTrace?: boolean;

  withLogs?: boolean;
};

export type SimulationResponseLog = {
  address: Hex;

  data: Hex;

  topics: Hex[];
};

export type SimulationResponseCallTrace = {
  calls: SimulationResponseCallTrace[];

  logs: SimulationResponseLog[];
};

export type SimulationResponseStateDiff = {
  [address: Hex]: {
    balance?: Hex;

    nonce?: Hex;

    storage?: {
      [slot: Hex]: Hex;
    };
  };
};

export type SimulationResponseTransaction = {
  error?: string;

  return: Hex;

  callTrace?: SimulationResponseCallTrace;

  stateDiff?: {
    pre?: SimulationResponseStateDiff;

    post?: SimulationResponseStateDiff;
  };
};

export type SimulationResponse = {
  transactions: SimulationResponseTransaction[];
};

type SimulationNetwork = {
  network: string;

  confirmations: boolean;
};

type SimulationNetworkResponse = {
  [chainIdDecimal: string]: SimulationNetwork;
};

let requestIdCounter = 0;

export async function simulateTransactions(
  chainId: Hex,
  request: SimulationRequest,
): Promise<SimulationResponse> {
  const url = await getSimulationUrl(chainId);

  const requestId = requestIdCounter;
  requestIdCounter += 1;

  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({
      id: String(requestId),
      jsonrpc: '2.0',
      method: RPC_METHOD,
      params: [request],
    }),
  });

  const responseJson = await response.json();

  if (responseJson.error) {
    const { code, message } = responseJson.error;
    throw new SimulationError(message, code);
  }

  return responseJson?.result;
}

async function getSimulationUrl(chainId: Hex): Promise<string> {
  const networkData = await getNetworkData();
  const chainIdDecimal = convertHexToDecimal(chainId);
  const network = networkData[chainIdDecimal];

  if (!network?.confirmations) {
    throw new SimulationChainNotSupportedError(chainId);
  }

  return getUrl(network.network);
}

async function getNetworkData(): Promise<SimulationNetworkResponse> {
  const url = `${getUrl('ethereum-mainnet')}${ENDPOINT_NETWORKS}`;
  const response = await fetch(url);
  return response.json() as any;
}

function getUrl(subdomain: string): string {
  return BASE_URL.replace('{0}', subdomain);
}
