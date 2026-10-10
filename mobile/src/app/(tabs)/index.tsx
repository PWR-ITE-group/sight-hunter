import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import GameMap from '../../components/map/GameMap';

const MOCK_PLACES = [
  { id: '1', lat: 51.109, lng: 17.032, found: true, name: 'Rynek' },
  { id: '2', lat: 51.106, lng: 17.042, found: false, radius_m: 200 },
  { id: '3', lat: 51.112, lng: 17.038, found: false, radius_m: 300 },
];
const MOCK_USER_POS = { lat: 51.1079, lng: 17.0385 };

export default function MapTab() {
  const router = useRouter();

  const handleMarkerPress = (taskId: string) => {
    router.push(`/task/${taskId}`);
  };

  return (
    <View className="flex-1 bg-surface">
      <GameMap
        places={MOCK_PLACES}
        userPosition={MOCK_USER_POS}
        onMarkerPress={handleMarkerPress}
        demoMode={true}
      />
    </View>
  );
}
