import React from 'react';
import { View, Text } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

type Props = {
  name: string;
  size: number;
  color: string;
  badge?: number;
};

export default function TabBarIcon({ name, size, color, badge }: Props) {
  return (
    <View className="relative">
      <FontAwesome5 name={name} size={size} color={color} />
      {!!badge && (
        <View className="absolute -top-1 -right-2 bg-error rounded-full min-w-[16px] h-4 items-center justify-center px-1">
          <Text className="text-white text-[10px] font-bold">{badge}</Text>
        </View>
      )}
    </View>
  );
}
