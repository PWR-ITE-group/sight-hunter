import { useQueries, useQuery } from '@tanstack/react-query';
import { getNearbyPlaces, getNextPlace, type NextMode, type NextPlace } from '../endpoints/places';
import { queryKeys } from './queryKeys';
import { Config } from '../../constants/config';
import { ApiClientError } from '../client';

/** ~100 m grid: the map doesn't refetch on every GPS jitter, only when the player really moves. */
function coarse(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function useNearbyPlaces(lat: number | null, lng: number | null, radius?: number) {
  const cLat = lat === null ? 0 : coarse(lat);
  const cLng = lng === null ? 0 : coarse(lng);
  return useQuery({
    queryKey: queryKeys.nearbyPlaces(cLat, cLng),
    queryFn: () => getNearbyPlaces(cLat, cLng, radius),
    enabled: lat !== null && lng !== null,
    refetchInterval: Config.NEARBY_REFETCH_INTERVAL_MS,
    select: (data) => data.items,
  });
}

const NEXT_MODES: NextMode[] = ['nearest', 'popular', 'random'];

function isAllFound(error: unknown): boolean {
  return error instanceof ApiClientError && error.status === 404;
}

/** The three "what next" suggestions. A 404 means every place is found — not an error. */
export function useNextPlaces(lat: number | null, lng: number | null) {
  const cLat = lat === null ? 0 : coarse(lat);
  const cLng = lng === null ? 0 : coarse(lng);
  return useQueries({
    queries: NEXT_MODES.map((mode) => ({
      queryKey: queryKeys.nextPlace(mode, cLat, cLng),
      queryFn: () => getNextPlace(cLat, cLng, mode),
      enabled: lat !== null && lng !== null,
      retry: (count: number, error: unknown) => !isAllFound(error) && count < 1,
      staleTime: 0,
    })),
    combine: (results) => {
      const byMode = {} as Record<NextMode, NextPlace | null>;
      NEXT_MODES.forEach((mode, i) => {
        byMode[mode] = results[i].data ?? null;
      });
      return {
        byMode,
        isLoading: results.some((r) => r.isLoading),
        allFound: results.length > 0 && results.every((r) => isAllFound(r.error)),
        error: results.find((r) => r.error && !isAllFound(r.error))?.error ?? null,
        refetch: () => results.forEach((r) => r.refetch()),
      };
    },
  });
}
