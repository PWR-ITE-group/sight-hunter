import { components } from '../schema';
import { apiClient } from '../client';

type PlaceMarker = components['schemas']['PlaceMarker'];
export type NextPlace = components['schemas']['NextPlace'];
export type NextMode = 'nearest' | 'popular' | 'random';

export async function getNearbyPlaces(
  lat: number,
  lng: number,
  radius?: number
): Promise<{ items: PlaceMarker[] }> {
  const params: Record<string, string | number> = { lat, lng };
  if (radius !== undefined) {
    params.radius = radius;
  }
  return apiClient('GET', '/places/nearby', { params });
}

/** Next unfound place to play; 404 (not_found) when everything is already found. */
export async function getNextPlace(lat: number, lng: number, mode: NextMode): Promise<NextPlace> {
  return apiClient('GET', '/places/next', { params: { lat, lng, mode } });
}
