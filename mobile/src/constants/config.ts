export const Config = {
  API_BASE_URL: typeof __DEV__ !== 'undefined' && __DEV__
    ? 'http://localhost:8000/api/v1'
    : 'https://api.sight-hunter.com/api/v1',
  ATTEMPT_POLL_INTERVAL_MS: 1000,
  ATTEMPT_POLL_MAX_RETRIES: 20,
  MAX_HINTS_PER_ROUND: 3,
  PHOTO_MAX_WIDTH: 1280,
  NEARBY_REFETCH_INTERVAL_MS: 30_000,
  TOKEN_REFRESH_THRESHOLD_MS: 2 * 60 * 1000,
} as const;
