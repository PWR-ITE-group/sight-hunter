import { components } from './schema';
import { useAuthStore } from '../store/authStore';
import { Config } from '../constants/config';
import { mockRequest, MockHttpError } from './mock/server';

type ApiError = components['schemas']['Error'];

export class ApiClientError extends Error {
  code: string;
  details?: Record<string, unknown>;
  status: number;

  constructor(status: number, error: ApiError) {
    super(error.message);
    this.name = 'ApiClientError';
    this.code = error.code;
    this.details = error.details;
    this.status = status;
  }
}

interface RequestOptions {
  body?: unknown;
  params?: Record<string, string | number>;
  headers?: Record<string, string>;
  noAuth?: boolean;
}

/**
 * Parses query parameters into a URL-encoded string.
 */
function buildQueryString(params?: Record<string, string | number>): string {
  if (!params || Object.keys(params).length === 0) return '';
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    searchParams.append(key, String(value));
  });
  return `?${searchParams.toString()}`;
}

/**
 * Inner function to perform the actual fetch call.
 */
async function performRequest<T>(
  method: string,
  url: string,
  options?: RequestOptions,
  accessToken?: string | null
): Promise<T> {
  const headers = new Headers(options?.headers);
  headers.set('Content-Type', 'application/json');

  if (!options?.noAuth && accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  if (options?.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, fetchOptions);

  if (!response.ok) {
    let errorData: ApiError;
    try {
      errorData = await response.json();
    } catch {
      errorData = {
        code: 'unknown_error' as any,
        message: `HTTP Error: ${response.status}`,
      };
    }
    throw new ApiClientError(response.status, errorData);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

/**
 * Main API Client that handles JWT injection, refreshing, and error mapping.
 */
export async function apiClient<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  options?: RequestOptions
): Promise<T> {
  if (Config.MOCK_API) {
    try {
      return await mockRequest<T>(method, path, options?.params, options?.body as Record<string, unknown> | undefined);
    } catch (e) {
      if (e instanceof MockHttpError) {
        throw new ApiClientError(e.status, { code: e.code as ApiError['code'], message: e.message, details: e.details });
      }
      throw e;
    }
  }
  const url = `${Config.API_BASE_URL}${path}${buildQueryString(options?.params)}`;
  
  const authStore = useAuthStore.getState();
  const accessToken = authStore.accessToken;
  const refreshToken = authStore.refreshToken;

  try {
    return await performRequest<T>(method, url, options, accessToken);
  } catch (error) {
    // Check if we need to attempt a token refresh
    if (
      error instanceof ApiClientError &&
      error.status === 401 &&
      !options?.noAuth &&
      path !== '/auth/refresh' &&
      refreshToken
    ) {
      try {
        // Attempt refresh
        const refreshUrl = `${Config.API_BASE_URL}/auth/refresh`;
        const refreshResponse = await performRequest<{ access: string; refresh: string; user: components['schemas']['User'] }>(
          'POST',
          refreshUrl,
          { body: { refresh: refreshToken }, noAuth: true }
        );

        // Success: save new tokens and update state
        await authStore.setTokens(refreshResponse.access, refreshResponse.refresh);
        // Use the new access token to retry the original request
        return await performRequest<T>(method, url, options, refreshResponse.access);
      } catch (refreshError) {
        // Refresh failed (e.g., refresh token expired)
        await authStore.logout();
        throw refreshError; // Re-throw the refresh error (or original error)
      }
    }
    
    // Not a 401 or refresh not applicable, just re-throw
    throw error;
  }
}
