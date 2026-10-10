import { components } from '../schema';
import { apiClient } from '../client';

type AttemptRequest = components['schemas']['AttemptRequest'];

export async function useHintEndpoint(
  roundId: string,
  idempotencyKey: string
): Promise<{ hint_text: string; hints_used: number; reward_points: number }> {
  return apiClient('POST', `/rounds/${roundId}/hints`, {
    headers: { 'Idempotency-Key': idempotencyKey }
  });
}

export async function createAttempt(
  roundId: string,
  data: AttemptRequest
): Promise<{ attempt_id: string; upload_url: string; upload_expires_at: string }> {
  return apiClient('POST', `/rounds/${roundId}/attempts`, { body: data });
}
