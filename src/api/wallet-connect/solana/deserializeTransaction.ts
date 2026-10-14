 import { VersionedTransaction } from '@solana/web3.js';
 import bs58 from 'bs58';

 export const deserializeTransaction = (transaction: string): VersionedTransaction => {
    let bytes: Uint8Array
    try {
      bytes = bs58.decode(transaction)
    } catch {
      // Convert base64 to Uint8Array to avoid type issues
      const buffer = Buffer.from(transaction, 'base64')
      bytes = new Uint8Array(buffer)
    }

    return VersionedTransaction.deserialize(bytes)
  }
