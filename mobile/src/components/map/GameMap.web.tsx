import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Colors } from '../../constants/colors';

type PlaceMarkerType = {
  id: string;
  lat: number;
  lng: number;
  found: boolean;
  name?: string;
  radius_m?: number;
};

type Props = {
  places: PlaceMarkerType[];
  userPosition: { lat: number; lng: number } | null;
  onMarkerPress: (taskId: string) => void;
  onLongPress?: (coords: { lat: number; lng: number }) => void;
  demoMode?: boolean;
};

/**
 * Web fallback: react-native-maps has no web build, so the browser gets a list of places.
 * "Stań tutaj" plays the long-tap of the native map (demo mode) by moving the position into the zone.
 */
export default function GameMap({ places, userPosition, onMarkerPress, onLongPress, demoMode }: Props) {
  return (
    <ScrollView className="flex-1 bg-paper" contentContainerStyle={{ padding: 16, paddingTop: 64, gap: 12 }}>
      <Text className="text-2xl font-bold text-app-text mb-2">Mapa (wersja web)</Text>
      <Text className="text-text-secondary mb-4">
        {userPosition
          ? `Twoja pozycja: ${userPosition.lat.toFixed(4)}, ${userPosition.lng.toFixed(4)}`
          : 'Brak pozycji'}
      </Text>
      {places.length === 0 && <Text className="text-text-secondary">Brak miejsc w pobliżu.</Text>}
      {places.map((p) => (
        <View key={p.id} className="bg-surface rounded-2xl p-4 border border-app-border">
          <Text className="text-lg font-bold text-app-text mb-1">{p.found ? `✅ ${p.name}` : '🔵 Nieodkryte miejsce'}</Text>
          <Text className="text-text-secondary text-sm mb-3">
            Strefa: {p.lat.toFixed(4)}, {p.lng.toFixed(4)} · {p.radius_m ?? 0} m
          </Text>
          <View className="flex-row gap-x-2">
            <Pressable onPress={() => onMarkerPress(p.id)} className="px-4 py-2 rounded-xl" style={{ backgroundColor: Colors.primary }}>
              <Text className="text-white font-semibold">Otwórz zadanie</Text>
            </Pressable>
            {demoMode && onLongPress && (
              <Pressable
                onPress={() => onLongPress({ lat: p.lat, lng: p.lng })}
                className="px-4 py-2 rounded-xl border border-app-border bg-surface"
              >
                <Text className="text-primary font-semibold">Stań tutaj</Text>
              </Pressable>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
