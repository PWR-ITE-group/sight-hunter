import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import GameMap from '../../components/map/GameMap';
import { ErrorBanner, errorMessage } from '../../components/ui/ErrorBanner';
import { useLocation } from '../../hooks/useLocation';
import { useNearbyPlaces } from '../../api/hooks/usePlaces';
import { useGameStore } from '../../store/gameStore';
import { useLocationStore } from '../../store/locationStore';

const NEARBY_RADIUS_M = 3000;

export default function MapTab() {
  const router = useRouter();
  const { position, error: locationError } = useLocation();
  const demoMode = useGameStore((s) => s.demoMode);
  const setMockPosition = useLocationStore((s) => s.setMockPosition);

  const nearby = useNearbyPlaces(position?.lat ?? null, position?.lng ?? null, NEARBY_RADIUS_M);

  // The API hides unfound places behind an offset search zone; the map draws exactly that.
  const places = useMemo(
    () =>
      (nearby.data ?? []).map((p) => ({
        id: p.task_id,
        lat: p.zone.lat,
        lng: p.zone.lng,
        radius_m: p.zone.radius_m,
        found: p.found,
        name: p.name ?? undefined,
      })),
    [nearby.data]
  );

  const handleLongPress = (coords: { lat: number; lng: number }) => {
    if (demoMode) {
      setMockPosition(coords.lat, coords.lng);
    }
  };

  return (
    <View className="flex-1 bg-paper">
      <GameMap
        places={places}
        userPosition={position ? { lat: position.lat, lng: position.lng } : null}
        onMarkerPress={(taskId) => router.push(`/task/${taskId}`)}
        onLongPress={handleLongPress}
        demoMode={demoMode}
      />

      <View className="absolute left-4 right-4" style={{ top: demoMode ? 100 : 48 }}>
        {nearby.error && (
          <ErrorBanner message={errorMessage(nearby.error)} onRetry={() => nearby.refetch()} />
        )}
        {!position && !nearby.error && (
          <View className="bg-white/90 rounded-xl px-4 py-3 border border-app-border">
            <Text className="text-app-text text-center">
              {locationError && !demoMode
                ? `${locationError}. Włącz lokalizację w ustawieniach telefonu.`
                : demoMode
                  ? 'Przytrzymaj palec na mapie, aby ustawić swoją pozycję.'
                  : 'Szukam Twojej pozycji…'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
