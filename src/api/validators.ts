import { z } from 'zod';

export const NetworkConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  rpcUrl: z.string().url(),
  chainId: z.number().optional(),
  symbol: z.string().optional(),
  explorerUrl: z.string().url().optional()
});

export const UserProfileSchema = z.object({
  address: z.string().min(10),
  name: z.string().optional(),
  balance: z.string().optional(),
  network: z.string()
});

export const TransactionSchema = z.object({
  to: z.string(),
  amount: z.string(),
  token: z.string(),
  network: z.string()
});

export function validateNetwork(data: any) {
  return NetworkConfigSchema.parse(data);
}

export function validateProfile(data: any) {
  return UserProfileSchema.parse(data);
}

export function validateTransaction(data: any) {
  return TransactionSchema.parse(data);
}
