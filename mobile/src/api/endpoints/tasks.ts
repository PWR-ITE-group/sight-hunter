import { components } from '../schema';
import { apiClient } from '../client';

type Task = components['schemas']['Task'];
type Round = components['schemas']['Round'];

export async function getTask(taskId: string): Promise<Task> {
  return apiClient('GET', `/tasks/${taskId}`);
}

export async function startRound(taskId: string): Promise<Round> {
  return apiClient('POST', `/tasks/${taskId}/rounds`);
}

export async function getShareLink(taskId: string): Promise<{ url: string }> {
  return apiClient('GET', `/tasks/${taskId}/share-link`);
}
