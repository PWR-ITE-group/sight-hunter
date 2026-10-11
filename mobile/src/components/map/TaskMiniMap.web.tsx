import React from 'react';
import { View, Text } from 'react-native';

interface TaskMiniMapProps {
  zone: { lat: number; lng: number; radius_m: number };
  userPosition: { lat: number; lng: number } | null;
}

/** Web fallback: react-native-maps has no web build. */
export default function TaskMiniMap({ zone, userPosition }: TaskMiniMapProps) {
  return (
    <View className="h-[180px] rounded-2xl border border-app-border bg-surface items-center justify-center p-4">
      <Text className="text-app-text font-bold mb-1">Strefa poszukiwań</Text>
      <Text className="text-text-secondary text-sm">
        {zone.lat.toFixed(4)}, {zone.lng.toFixed(4)} · promień {zone.radius_m} m
      </Text>
      {userPosition && (
        <Text className="text-text-tertiary text-xs mt-2">
          Ty: {userPosition.lat.toFixed(4)}, {userPosition.lng.toFixed(4)}
        </Text>
      )}
    </View>
  );
}
