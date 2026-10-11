import React from 'react';
import { Circle } from 'react-native-maps';

type Props = {
  center: { lat: number; lng: number };
  radius_m: number;
};

export default function SearchCircle({ center, radius_m }: Props) {
  return (
    <Circle
      center={{ latitude: center.lat, longitude: center.lng }}
      radius={radius_m}
      fillColor="rgba(32,138,239,0.15)"
      strokeColor="rgba(32,138,239,0.4)"
      strokeWidth={1}
    />
  );
}
