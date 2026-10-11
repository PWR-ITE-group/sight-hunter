import { components } from '../schema';
import { apiClient } from '../client';

export type AuthResponse = {
  access: string;
  refresh: string;
  user: components['schemas']['User'];
};

export async function register(data: components['schemas']['RegisterRequest']): Promise<AuthResponse> {
  return apiClient('POST', '/auth/register', { body: data, noAuth: true });
}

export async function login(data: components['schemas']['LoginRequest']): Promise<AuthResponse> {
  return apiClient('POST', '/auth/login', { body: data, noAuth: true });
}

export async function refreshTokens(refresh: string): Promise<AuthResponse> {
  return apiClient('POST', '/auth/refresh', { body: { refresh }, noAuth: true });
}

export async function requestPasswordReset(email: string): Promise<void> {
  return apiClient('POST', '/auth/password-reset', { body: { email }, noAuth: true });
}
