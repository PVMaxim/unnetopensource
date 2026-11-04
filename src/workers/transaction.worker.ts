import { CmdSignSecp256k1, CmdSignEd25519 } from "@/api/card-io";
import { CardErrorCode, CardKeys } from "@/api/common";
import { secp256k1 } from "@noble/curves/secp256k1";
import { ed25519 } from "@noble/curves/ed25519";

export interface PendingSignSession {
  id: string;
  chain: string;
  curve: 'secp256k1' | 'ed25519';
  dataHash: string;
  expectedPublicKey?: string;
  createdAt: number;
}

const activeSessions = new Map<string, PendingSignSession>();
const secpSigner = new CmdSignSecp256k1();
const edSigner = new CmdSignEd25519();

self.onmessage = async (event: MessageEvent) => {
  const { id, type, payload } = event.data;

  try {
    switch (type) {
      case 'BUILD_CARD_PAYLOAD': {
        const { chain = 'evm', curve, dataHash, expectedPublicKey, pin } = payload;

        const cleanHash = typeof dataHash === 'string' ? dataHash.replace(/^0x/i, '') : '';
        if (cleanHash.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(cleanHash)) {
          throw new Error('Invalid dataHash: must be a 32-byte hex string (64 characters)');
        }

        if (curve !== 'secp256k1' && curve !== 'ed25519') {
          throw new Error(`Unsupported curve: ${curve}. Expected 'secp256k1' or 'ed25519'`);
        }

        if (typeof pin !== 'string' || pin.length < 4) {
          throw new Error('Invalid PIN: must be a string with at least 4 digits');
        }

        let apduBytes: Uint8Array;
        let expectedResponseSize: number;

        if (curve === 'secp256k1') {
          apduBytes = await secpSigner.buildRequest({ dataHash: cleanHash, pin });
          expectedResponseSize = secpSigner.getExpectedResponseSize();
        } else {
          apduBytes = await edSigner.buildRequest({ dataHash: cleanHash, pin });
          expectedResponseSize = edSigner.getExpectedResponseSize();
        }

        activeSessions.set(id, {
          id,
          chain,
          curve,
          dataHash: cleanHash,
          expectedPublicKey,
          createdAt: Date.now(),
        });

        self.postMessage({
          id,
          success: true,
          type: 'CARD_TRANSCEIVE_REQUEST',
          payload: {
            apduBytes: Array.from(apduBytes),
            expectedResponseSize,
          },
        });
        break;
      }

      case 'PROCESS_CARD_RESPONSE': {
        const { rawResponseBytes } = payload;
        const session = activeSessions.get(id);

        if (!session) {
          throw new Error(`No active signing session found for ID: ${id}`);
        }

        activeSessions.delete(id);

        const responseBuffer = rawResponseBytes instanceof Uint8Array
          ? rawResponseBytes
          : new Uint8Array(rawResponseBytes);

        let parsed: {
          errorCode: CardErrorCode;
          keys: CardKeys;
          signature: string;
          pinRemaining: number;
        };

        if (session.curve === 'secp256k1') {
          parsed = secpSigner.parseResponse(responseBuffer);
        } else {
          parsed = edSigner.parseResponse(responseBuffer);
        }

        if (parsed.errorCode !== CardErrorCode.Success) {
          self.postMessage({
            id,
            success: false,
            error: {
              code: parsed.errorCode,
              pinRemaining: parsed.pinRemaining,
            },
          });
          return;
        }

        const cardKey = session.curve === 'secp256k1' ? parsed.keys.secp256k1 : parsed.keys.ed25519;
        if (session.expectedPublicKey && cardKey) {
          const cleanExpected = session.expectedPublicKey.replace(/^0x/i, '').toLowerCase();
          const cleanReturned = cardKey.replace(/^0x/i, '').toLowerCase();
          if (cleanExpected !== cleanReturned) {
            throw new Error(`Card public key mismatch: expected ${cleanExpected}, got ${cleanReturned}`);
          }
        }

        self.postMessage({
          id,
          success: true,
          result: {
            errorCode: parsed.errorCode,
            keys: parsed.keys,
            signature: parsed.signature,
            pinRemaining: parsed.pinRemaining,
            dataHash: session.dataHash,
          },
        });
        break;
      }

      case 'VERIFY_SIGNATURE': {
        const { curve, dataHash, signature, publicKey } = payload;
        const cleanHash = dataHash.replace(/^0x/i, '');
        const cleanSig = signature.replace(/^0x/i, '');
        const cleanKey = publicKey.replace(/^0x/i, '');

        let isValid = false;
        if (curve === 'secp256k1') {
          isValid = secp256k1.verify(cleanSig, cleanHash, cleanKey);
        } else if (curve === 'ed25519') {
          isValid = ed25519.verify(cleanSig, cleanHash, cleanKey);
        }

        self.postMessage({ id, success: true, result: { isValid } });
        break;
      }

      default:
        self.postMessage({ id, success: false, error: `Unknown worker action: ${type}` });
    }
  } catch (err: unknown) {
    activeSessions.delete(id);
    const message = err instanceof Error ? err.message : String(err);
    self.postMessage({ id, success: false, error: message });
  }
};

