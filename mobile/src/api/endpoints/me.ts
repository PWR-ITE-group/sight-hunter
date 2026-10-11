import { components } from '../schema';
import { apiClient } from '../client';

type User = components['schemas']['User'];

export async function getMe(): Promise<User> {
  return apiClient('GET', '/me');
}

export async function setNickname(nickname: string): Promise<User> {
  return apiClient('PUT', '/me/nickname', { body: { nickname } });
}
