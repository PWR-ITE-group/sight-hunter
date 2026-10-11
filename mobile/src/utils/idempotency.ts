import { randomUUID } from 'expo-crypto';

export function generateIdempotencyKey(): string {
  return randomUUID();
}
