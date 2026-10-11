import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { PROVIDER_DEFAULT } from 'react-native-maps';
import PlaceMarker from './PlaceMarker';
import SearchCircle from './SearchCircle';
import { Feather } from '@expo/vector-icons';

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

export default function GameMap({ places, userPosition, onMarkerPress, onLongPress, demoMode }: Props) {
  const mapRef = useRef<MapView>(null);

  const handleCenter = () => {
    if (userPosition && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userPosition.lat,
        longitude: userPosition.lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
    }
  };

  return (
    <View className="flex-1">
      {demoMode && (
        <View className="absolute top-12 z-10 w-full px-4">
          <View className="bg-warning rounded-lg p-3 shadow-md flex-row items-center justify-center">
            <Text className="text-white font-bold text-center">
              Tryb demo — dotknij i przytrzymaj mapę
            </Text>
          </View>
        </View>
      )}

      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFill}
        initialRegion={{
          latitude: 51.1079,
          longitude: 17.0385,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        onLongPress={(e) => {
          if (onLongPress) {
            onLongPress({
              lat: e.nativeEvent.coordinate.latitude,
              lng: e.nativeEvent.coordinate.longitude,
            });
          }
        }}
        showsUserLocation={!!userPosition}
        showsMyLocationButton={false}
      >
        {places.map((place) => (
          <React.Fragment key={place.id}>
            {!place.found && place.radius_m && (
              <SearchCircle center={{ lat: place.lat, lng: place.lng }} radius_m={place.radius_m} />
            )}
            <PlaceMarker place={place} onPress={() => onMarkerPress(place.id)} />
          </React.Fragment>
        ))}
      </MapView>

      <TouchableOpacity
        className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-white items-center justify-center shadow-lg border border-app-border"
        onPress={handleCenter}
        activeOpacity={0.8}
      >
        <Feather name="navigation" size={24} color="#2c52c4" />
      </TouchableOpacity>
    </View>
  );
}
