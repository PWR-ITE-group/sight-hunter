import { components } from '../schema';
import { apiClient } from '../client';

type Attempt = components['schemas']['Attempt'];

export async function submitAttempt(
  attemptId: string,
  idempotencyKey: string
): Promise<Attempt> {
  return apiClient('POST', `/attempts/${attemptId}/submit`, {
    headers: { 'Idempotency-Key': idempotencyKey }
  });
}

export async function getAttempt(attemptId: string): Promise<Attempt> {
  return apiClient('GET', `/attempts/${attemptId}`);
}
