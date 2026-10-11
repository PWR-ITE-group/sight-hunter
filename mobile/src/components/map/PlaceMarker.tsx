import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { Marker } from 'react-native-maps';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

type PlaceMarkerType = {
  id: string;
  lat: number;
  lng: number;
  found: boolean;
  name?: string;
};

type Props = {
  place: PlaceMarkerType;
  onPress: () => void;
};

export default function PlaceMarker({ place, onPress }: Props) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!place.found) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      scale.value = 1;
      opacity.value = 1;
    }
  }, [place.found, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  return (
    <Marker
      coordinate={{ latitude: place.lat, longitude: place.lng }}
      onPress={onPress}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View className="items-center justify-center">
        {place.found && place.name && (
          <View className="bg-white px-2 py-1 rounded-md mb-1 border border-app-border">
            <Text className="text-[10px] font-bold text-app-text">{place.name}</Text>
          </View>
        )}
        <Animated.View
          style={[
            {
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: place.found ? '#2c8350' : '#b5422e',
              borderWidth: 3,
              borderColor: 'white',
            },
            animatedStyle,
          ]}
          className="shadow-md"
        />
      </View>
    </Marker>
  );
}
