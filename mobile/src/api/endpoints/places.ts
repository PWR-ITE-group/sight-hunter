import { components } from '../schema';
import { apiClient } from '../client';

type PlaceMarker = components['schemas']['PlaceMarker'];

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
