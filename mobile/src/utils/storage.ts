import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEYS = {
  ACCESS: 'access_token',
  REFRESH: 'refresh_token',
} as const;

// expo-secure-store has no web implementation; the browser build (debugging only) uses localStorage.
const web = Platform.OS === 'web';

async function setItem(key: string, value: string): Promise<void> {
  if (web) {
    globalThis.localStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (web) return globalThis.localStorage?.getItem(key) ?? null;
  return SecureStore.getItemAsync(key);
}

async function deleteItem(key: string): Promise<void> {
  if (web) {
    globalThis.localStorage?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function setTokens(access: string, refresh: string): Promise<void> {
  await Promise.all([setItem(KEYS.ACCESS, access), setItem(KEYS.REFRESH, refresh)]);
}

export async function getAccessToken(): Promise<string | null> {
  return getItem(KEYS.ACCESS);
}

export async function getRefreshToken(): Promise<string | null> {
  return getItem(KEYS.REFRESH);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([deleteItem(KEYS.ACCESS), deleteItem(KEYS.REFRESH)]);
}
