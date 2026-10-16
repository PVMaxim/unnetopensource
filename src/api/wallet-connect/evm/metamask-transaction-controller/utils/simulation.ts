import type { Fragment, LogDescription, Result } from '@ethersproject/abi';
import { Interface } from '@ethersproject/abi';
import { hexToBN, toHex } from '@metamask/controller-utils';
import { abiERC20, abiERC721, abiERC1155 } from '@metamask/metamask-eth-abis';
import { type Hex } from '@metamask/utils';

import {
  ABI_SIMULATION_ERC20_WRAPPED,
  ABI_SIMULATION_ERC721_LEGACY,
} from '../constants';
import {
  SimulationError,
  SimulationInvalidResponseError,
  SimulationRevertedError,
} from '../errors';
import type {
  SimulationBalanceChange,
  SimulationData,
  SimulationTokenBalanceChange,
  SimulationToken,
} from '../types';
import { SimulationTokenStandard } from '../types';
import { simulateTransactions } from './simulation-api';
import type {
  SimulationResponseLog,
  SimulationRequestTransaction,
  SimulationResponse,
  SimulationResponseCallTrace,
  SimulationResponseTransaction,
} from './simulation-api';

export enum SupportedToken {
  ERC20 = 'erc20',
  ERC721 = 'erc721',
  ERC1155 = 'erc1155',
  ERC20_WRAPPED = 'erc20Wrapped',
  ERC721_LEGACY = 'erc721Legacy',
}

type ABI = Fragment[];

export type GetSimulationDataRequest = {
  chainId: Hex;
  data?: Hex;
  from: Hex;
  to?: Hex;
  value?: Hex;
};

type ParsedEvent = {
  contractAddress: Hex;
  tokenStandard: SimulationTokenStandard;
  name: string;
  args: Record<string, Hex | Hex[]>;
  abi: ABI;
};

type GetSimulationDataOptions = {
  blockTime?: number;
};

const SUPPORTED_EVENTS = [
  'Transfer',
  'TransferSingle',
  'TransferBatch',
  'Deposit',
  'Withdrawal',
];

const SUPPORTED_TOKEN_ABIS = {
  [SupportedToken.ERC20]: {
    abi: abiERC20,
    standard: SimulationTokenStandard.erc20,
  },
  [SupportedToken.ERC721]: {
    abi: abiERC721,
    standard: SimulationTokenStandard.erc721,
  },
  [SupportedToken.ERC1155]: {
    abi: abiERC1155,
    standard: SimulationTokenStandard.erc1155,
  },
  [SupportedToken.ERC20_WRAPPED]: {
    abi: ABI_SIMULATION_ERC20_WRAPPED,
    standard: SimulationTokenStandard.erc20,
  },
  [SupportedToken.ERC721_LEGACY]: {
    abi: ABI_SIMULATION_ERC721_LEGACY,
    standard: SimulationTokenStandard.erc721,
  },
};

const REVERTED_ERRORS = ['execution reverted', 'insufficient funds for gas'];

type BalanceTransactionMap = Map<SimulationToken, SimulationRequestTransaction>;

export async function getSimulationData(
  request: GetSimulationDataRequest,
  options: GetSimulationDataOptions = {},
): Promise<SimulationData> {
  const { chainId, from, to, value, data } = request;
  const { blockTime } = options;

  try {
    const response = await simulateTransactions(chainId, {
      transactions: [
        {
          data,
          from,
          maxFeePerGas: '0x0',
          maxPriorityFeePerGas: '0x0',
          to,
          value,
        },
      ],
      withCallTrace: true,
      withLogs: true,
      ...(blockTime && {
        blockOverrides: {
          time: toHex(blockTime),
        },
      }),
    });

    const transactionError = response.transactions?.[0]?.error;

    if (transactionError) {
      throw new SimulationError(transactionError);
    }

    const nativeBalanceChange = getNativeBalanceChange(request.from, response);
    const events = getEvents(response);

    const tokenBalanceChanges = await getTokenBalanceChanges(
      request,
      events,
      options,
    );

    return {
      nativeBalanceChange,
      tokenBalanceChanges,
    };
  } catch (error) {

    let simulationError = error as SimulationError;

    if (
      REVERTED_ERRORS.some((revertErrorMessage) =>
        simulationError.message?.includes(revertErrorMessage),
      )
    ) {
      simulationError = new SimulationRevertedError();
    }

    const { code, message } = simulationError;

    return {
      tokenBalanceChanges: [],
      error: {
        code,
        message,
      },
    };
  }
}

function getNativeBalanceChange(
  userAddress: Hex,
  response: SimulationResponse,
): SimulationBalanceChange | undefined {
  const transactionResponse = response.transactions[0];

  if (!transactionResponse) {
    return undefined;
  }

  const { stateDiff } = transactionResponse;
  const userAddressNormalized = normalizeEventArgValue(userAddress);
  const previousBalance = stateDiff?.pre?.[userAddressNormalized]?.balance;
  const newBalance = stateDiff?.post?.[userAddressNormalized]?.balance;

  if (!previousBalance || !newBalance) {
    return undefined;
  }

  return getSimulationBalanceChange(previousBalance, newBalance);
}

export function getEvents(response: SimulationResponse): ParsedEvent[] {
  const logs = extractLogs(
    response.transactions[0]?.callTrace ?? ({} as SimulationResponseCallTrace),
  );

  const interfaces = getContractInterfaces();

  return logs
    .map((currentLog) => {
      const event = parseLog(currentLog, interfaces);

      if (!event) {
        return undefined;
      }

      const inputs = event.abi.find((e) => e.name === event.name)?.inputs;

      if (!inputs) {
        return undefined;
      }

      if (!SUPPORTED_EVENTS.includes(event.name)) {
        return undefined;
      }

      const args = normalizeEventArgs(event.args, inputs);

      return {
        contractAddress: currentLog.address,
        tokenStandard: event.standard,
        name: event.name,
        args,
        abi: event.abi,
      };
    })
    .filter((e) => e !== undefined) as ParsedEvent[];
}

function normalizeEventArgs(
  args: Result,
  abiInputs: { name: string }[],
): Record<string, Hex | Hex[]> {
  return args.reduce((result, arg, index) => {
    const name = abiInputs[index].name.replace('_', '');
    const value = normalizeEventArgValue(arg);

    result[name] = value;

    return result;
  }, {});
}

function normalizeEventArgValue(value: any): any {
  if (Array.isArray(value)) {
    return value.map(normalizeEventArgValue);
  }

  let normalizedValue = value;

  normalizedValue = normalizedValue.toHexString?.() ?? normalizedValue;
  normalizedValue = normalizedValue.toLowerCase?.() ?? normalizedValue;

  return normalizedValue;
}

async function getTokenBalanceChanges(
  request: GetSimulationDataRequest,
  events: ParsedEvent[],
  options: GetSimulationDataOptions,
): Promise<SimulationTokenBalanceChange[]> {
  const { blockTime } = options;
  const balanceTxs = getTokenBalanceTransactions(request, events);

  const transactions = [
    ...balanceTxs.before.values(),
    request,
    ...balanceTxs.after.values(),
  ];

  if (transactions.length === 1) {
    return [];
  }

  const response = await simulateTransactions(request.chainId as Hex, {
    transactions,
    ...(blockTime && {
      blockOverrides: {
        time: toHex(blockTime),
      },
    }),
  });

  if (response.transactions.length !== transactions.length) {
    throw new SimulationInvalidResponseError();
  }

  let prevBalanceTxIndex = 0;
  return [...balanceTxs.after.keys()]
    .map((token, index) => {
      const previousBalanceCheckSkipped = !balanceTxs.before.get(token);
      const previousBalance = previousBalanceCheckSkipped
        ? '0x0'
        : getAmountFromBalanceTransactionResult(
            request.from,
            token,
            response.transactions[prevBalanceTxIndex++],
          );

      const newBalance = getAmountFromBalanceTransactionResult(
        request.from,
        token,
        response.transactions[index + balanceTxs.before.size + 1],
      );

      const balanceChange = getSimulationBalanceChange(
        previousBalance,
        newBalance,
      );

      if (!balanceChange) {
        return undefined;
      }

      return {
        ...token,
        ...balanceChange,
      };
    })
    .filter((change) => change !== undefined) as SimulationTokenBalanceChange[];
}

function getTokenBalanceTransactions(
  request: GetSimulationDataRequest,
  events: ParsedEvent[],
): {
  before: BalanceTransactionMap;
  after: BalanceTransactionMap;
} {
  const tokenKeys = new Set();
  const before = new Map();
  const after = new Map();

  const fromNormalized = normalizeEventArgValue(request.from);
  const userEvents = events.filter((event) =>
    [event.args.from, event.args.to].findIndex(item => normalizeEventArgValue(item || '') == fromNormalized) >= 0,
  );

  for (const event of userEvents) {
    const tokenIds = getEventTokenIds(event);

    for (const tokenId of tokenIds) {
      const simulationToken: SimulationToken = {
        address: event.contractAddress,
        standard: event.tokenStandard,
        id: tokenId,
      };

      const tokenKey = JSON.stringify(simulationToken);

      if (tokenKeys.has(tokenKey)) {
        continue;
      }

      tokenKeys.add(tokenKey);

      const data = getBalanceTransactionData(
        event.tokenStandard,
        request.from,
        tokenId,
      );

      const transaction: SimulationRequestTransaction = {
        from: request.from,
        to: event.contractAddress,
        data,
      };

      if (skipPriorBalanceCheck(event)) {
        after.set(simulationToken, transaction);
      } else {
        before.set(simulationToken, transaction);
        after.set(simulationToken, transaction);
      }
    }
  }

  return { before, after };
}

function skipPriorBalanceCheck(event: ParsedEvent): boolean {
  return (
    event.name === 'Transfer' &&
    event.tokenStandard === SimulationTokenStandard.erc721 &&
    parseInt(event.args.from as string, 16) === 0
  );
}

function getEventTokenIds(event: ParsedEvent): (Hex | undefined)[] {
  if (event.tokenStandard === SimulationTokenStandard.erc721) {
    return [event.args.tokenId as Hex];
  }

  if (
    event.tokenStandard === SimulationTokenStandard.erc1155 &&
    event.name === 'TransferSingle'
  ) {
    return [event.args.id as Hex];
  }

  if (
    event.tokenStandard === SimulationTokenStandard.erc1155 &&
    event.name === 'TransferBatch'
  ) {
    return event.args.ids as Hex[];
  }

  return [undefined];
}

function getContractInterface(
  tokenStandard: SimulationTokenStandard,
): Interface {
  switch (tokenStandard) {
    case SimulationTokenStandard.erc721:
      return new Interface(abiERC721);
    case SimulationTokenStandard.erc1155:
      return new Interface(abiERC1155);
    default:
      return new Interface(abiERC20);
  }
}

function getAmountFromBalanceTransactionResult(
  from: Hex,
  token: SimulationToken,
  response: SimulationResponseTransaction,
): Hex {
  const contract = getContractInterface(token.standard);

  try {
    if (token.standard === SimulationTokenStandard.erc721) {
      const result = contract.decodeFunctionResult('ownerOf', response.return);
      const owner = result[0];
      return owner.toLowerCase() === from.toLowerCase() ? '0x1' : '0x0';
    }

    const result = contract.decodeFunctionResult('balanceOf', response.return);
    return toHex(result[0]);
  } catch (error) {
    throw new SimulationError(
      `Failed to decode balance transaction for token ${
        token.address
      }: ${String(error)}`,
    );
  }
}

function getBalanceTransactionData(
  tokenStandard: SimulationTokenStandard,
  from: Hex,
  tokenId?: Hex,
): Hex {
  const contract = getContractInterface(tokenStandard);
  switch (tokenStandard) {
    case SimulationTokenStandard.erc721:
      return contract.encodeFunctionData('ownerOf', [tokenId]) as Hex;

    case SimulationTokenStandard.erc1155:
      return contract.encodeFunctionData('balanceOf', [from, tokenId]) as Hex;

    default:
      return contract.encodeFunctionData('balanceOf', [from]) as Hex;
  }
}

function parseLog(
  eventLog: SimulationResponseLog,
  interfaces: Map<SupportedToken, Interface>,
):
  | (LogDescription & { abi: ABI; standard: SimulationTokenStandard })
  | undefined {
  const supportedTokens = Object.values(SupportedToken);

  for (const token of supportedTokens) {
    try {
      const contractInterface = interfaces.get(token) as Interface;
      const { abi, standard } = SUPPORTED_TOKEN_ABIS[token];

      return {
        ...contractInterface.parseLog(eventLog),
        abi: abi as any,
        standard,
      };
    } catch (e) {
      continue;
    }
  }

  return undefined;
}

function extractLogs(
  call: SimulationResponseCallTrace,
): SimulationResponseLog[] {
  const logs = call.logs ?? [];

  const nestedCalls = call.calls ?? [];

  return [
    ...logs,
    ...nestedCalls.map((nestedCall) => extractLogs(nestedCall)).flat(),
  ];
}

function getSimulationBalanceChange(
  previousBalance: Hex,
  newBalance: Hex,
): SimulationBalanceChange | undefined {
  const differenceBN = hexToBN(newBalance).sub(hexToBN(previousBalance));
  const isDecrease = differenceBN.isNeg();
  const difference = toHex(differenceBN.abs());

  if (differenceBN.isZero()) {
    return undefined;
  }

  return {
    previousBalance,
    newBalance,
    difference,
    isDecrease,
  };
}

function getContractInterfaces(): Map<SupportedToken, Interface> {
  const supportedTokens = Object.values(SupportedToken);

  return new Map(
    supportedTokens.map((tokenType) => {
      const { abi } = SUPPORTED_TOKEN_ABIS[tokenType];
      const contractInterface = new Interface(abi);
      return [tokenType, contractInterface];
    }),
  );
}
