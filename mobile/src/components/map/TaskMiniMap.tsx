import React from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Circle, Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { Colors } from '../../constants/colors';

interface TaskMiniMapProps {
  zone: { lat: number; lng: number; radius_m: number };
  userPosition: { lat: number; lng: number } | null;
}

/** Static close-up of the search zone on the task card, with the player's own position. */
export default function TaskMiniMap({ zone, userPosition }: TaskMiniMapProps) {
  // Fit the circle plus the player if they are reasonably close; otherwise just the circle.
  const points = [{ lat: zone.lat, lng: zone.lng }];
  if (userPosition) {
    const dLat = Math.abs(userPosition.lat - zone.lat);
    const dLng = Math.abs(userPosition.lng - zone.lng);
    if (dLat < 0.03 && dLng < 0.05) points.push(userPosition);
  }
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const radiusDeg = (zone.radius_m * 1.6) / 111_320;
  const region = {
    latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
    longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
    latitudeDelta: Math.max(radiusDeg * 2, Math.max(...lats) - Math.min(...lats) + radiusDeg),
    longitudeDelta: Math.max(radiusDeg * 2, Math.max(...lngs) - Math.min(...lngs) + radiusDeg),
  };

  return (
    <View style={styles.wrap} pointerEvents="none">
      <MapView
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        showsUserLocation={false}
      >
        <Circle
          center={{ latitude: zone.lat, longitude: zone.lng }}
          radius={zone.radius_m}
          fillColor={Colors.searchCircle}
          strokeColor={Colors.searchCircleBorder}
          strokeWidth={2}
        />
        {userPosition && (
          <Marker coordinate={{ latitude: userPosition.lat, longitude: userPosition.lng }} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.me} />
          </Marker>
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  me: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    borderWidth: 3,
    borderColor: '#fff',
  },
});
