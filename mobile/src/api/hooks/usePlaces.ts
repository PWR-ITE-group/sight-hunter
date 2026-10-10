import { useQuery } from '@tanstack/react-query';
import { getNearbyPlaces } from '../endpoints/places';
import { queryKeys } from './queryKeys';
import { Config } from '../../constants/config';

export function useNearbyPlaces(lat: number | null, lng: number | null, radius?: number) {
  return useQuery({
    queryKey: queryKeys.nearbyPlaces(lat ?? 0, lng ?? 0),
    queryFn: () => getNearbyPlaces(lat!, lng!, radius),
    enabled: lat !== null && lng !== null,
    refetchInterval: Config.NEARBY_REFETCH_INTERVAL_MS,
    select: (data) => data.items,
  });
}
