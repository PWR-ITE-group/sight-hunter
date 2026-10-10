import Constants from 'expo-constants';

/**
 * API base URL. In Expo Go the phone can't reach "localhost", so in development we point
 * at the machine that serves the JS bundle (same laptop that runs `docker compose up`).
 * Override the port with EXPO_PUBLIC_API_PORT, or the whole URL with EXPO_PUBLIC_API_URL (e.g. a tunnel)
 * when the venue Wi-Fi isolates devices.
 */
function resolveApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    const host = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost';
    // API_PORT from the repo .env; 8000 may be taken by another project on the laptop.
    const port = process.env.EXPO_PUBLIC_API_PORT ?? '8000';
    return `http://${host}:${port}/api/v1`;
  }
  return 'https://api.sight-hunter.com/api/v1';
}

export const Config = {
  API_BASE_URL: resolveApiBaseUrl(),
  /** EXPO_PUBLIC_MOCK_API=1: in-memory fake of the contract, no backend needed (src/api/mock). */
  MOCK_API: process.env.EXPO_PUBLIC_MOCK_API === '1',
  ATTEMPT_POLL_INTERVAL_MS: 1000,
  ATTEMPT_POLL_MAX_RETRIES: 20,
  MAX_HINTS_PER_ROUND: 3,
  PHOTO_MAX_WIDTH: 1280,
  NEARBY_REFETCH_INTERVAL_MS: 30_000,
  TOKEN_REFRESH_THRESHOLD_MS: 2 * 60 * 1000,
  /** Demo mode (manual position by long-tap) is on by default in dev builds for the stage demo. */
  DEMO_MODE_DEFAULT: typeof __DEV__ !== 'undefined' && __DEV__,
  SHARE_BASE_URL: 'https://lowcyhistorii.pl',
} as const;
