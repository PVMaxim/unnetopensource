import { CardErrorCode, CardKeys } from "./common";
import { CmdSignSecp256k1, CmdSignEd25519 } from "./card-io";

export interface PrepareSignParams {
  chain?: string;
  curve: 'secp256k1' | 'ed25519';
  dataHash: string;
  expectedPublicKey?: string;
  pin: string;
}

export interface CardTransceivePlan {
  sessionId: string;
  apduBytes: Uint8Array;
  expectedResponseSize: number;
}

export interface CardSignedResult {
  errorCode: CardErrorCode;
  keys: CardKeys;
  signature: string;
  pinRemaining: number;
  dataHash: string;
}

export interface ExecuteSignParams extends PrepareSignParams {
  transceive: (apduBytes: Uint8Array, expectedResponseSize: number) => Promise<Uint8Array>;
}

let workerInstance: Worker | null = null;
const pendingWorkerRequests = new Map<
  string,
  { resolve: (val: unknown) => void; reject: (err: unknown) => void }
>();
let reqCounter = 0;

function getTransactionWorker(): Worker | null {
  if (typeof window === 'undefined') return null;

  if (!workerInstance && typeof window.Worker !== 'undefined') {
    try {
      workerInstance = new Worker(
        new URL('../workers/transaction.worker.ts', import.meta.url),
        { type: 'module' }
      );

      workerInstance.onmessage = (event: MessageEvent) => {
        const { id, success, type, payload, result, error } = event.data;
        const pending = pendingWorkerRequests.get(id);
        if (!pending) return;

        pendingWorkerRequests.delete(id);

        if (success) {
          pending.resolve(type === 'CARD_TRANSCEIVE_REQUEST' ? payload : result);
        } else {
          pending.reject(error instanceof Error ? error : new Error(typeof error === 'object' ? JSON.stringify(error) : error));
        }
      };

      workerInstance.onerror = (err) => {
        pendingWorkerRequests.forEach(({ reject }) => reject(err));
        pendingWorkerRequests.clear();
      };
    } catch {
      workerInstance = null;
    }
  }

  return workerInstance;
}

export async function prepareCardSignIsolated(params: PrepareSignParams): Promise<CardTransceivePlan> {
  const worker = getTransactionWorker();
  const id = `tx_sign_${++reqCounter}_${Date.now()}`;

  if (worker) {
    return new Promise<CardTransceivePlan>((resolve, reject) => {
      pendingWorkerRequests.set(id, {
        resolve: (data: unknown) => {
          const res = data as { apduBytes: number[]; expectedResponseSize: number };
          resolve({
            sessionId: id,
            apduBytes: new Uint8Array(res.apduBytes),
            expectedResponseSize: res.expectedResponseSize,
          });
        },
        reject,
      });

      worker.postMessage({
        id,
        type: 'BUILD_CARD_PAYLOAD',
        payload: params,
      });
    });
  }

  const signer = params.curve === 'secp256k1' ? new CmdSignSecp256k1() : new CmdSignEd25519();
  const cleanHash = params.dataHash.replace(/^0x/i, '');
  const apduBytes = await signer.buildRequest({ dataHash: cleanHash, pin: params.pin });

  return {
    sessionId: id,
    apduBytes,
    expectedResponseSize: signer.getExpectedResponseSize(),
  };
}

export async function processCardResponseIsolated(
  sessionId: string,
  rawResponseBytes: Uint8Array,
  fallbackParams?: PrepareSignParams
): Promise<CardSignedResult> {
  const worker = getTransactionWorker();

  if (worker) {
    return new Promise<CardSignedResult>((resolve, reject) => {
      pendingWorkerRequests.set(sessionId, {
        resolve: (data: unknown) => resolve(data as CardSignedResult),
        reject,
      });

      worker.postMessage({
        id: sessionId,
        type: 'PROCESS_CARD_RESPONSE',
        payload: {
          rawResponseBytes: Array.from(rawResponseBytes),
        },
      });
    });
  }

  if (!fallbackParams) {
    throw new Error('Fallback parameters required when Web Worker is not available');
  }
  const signer = fallbackParams.curve === 'secp256k1' ? new CmdSignSecp256k1() : new CmdSignEd25519();
  const parsed = signer.parseResponse(rawResponseBytes);

  return {
    errorCode: parsed.errorCode,
    keys: parsed.keys,
    signature: parsed.signature,
    pinRemaining: parsed.pinRemaining,
    dataHash: fallbackParams.dataHash,
  };
}

export async function executeCardSigningIsolated(params: ExecuteSignParams): Promise<CardSignedResult> {
  const plan = await prepareCardSignIsolated(params);
  const rawResponseBytes = await params.transceive(plan.apduBytes, plan.expectedResponseSize);
  return processCardResponseIsolated(plan.sessionId, rawResponseBytes, params);
}

