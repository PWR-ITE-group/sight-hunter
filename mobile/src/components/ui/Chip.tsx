import React from 'react';
import { Pressable, Text, ViewStyle, StyleProp } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export function Chip({ label, selected = false, onPress, className = '', style }: ChipProps) {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    if (onPress) scale.value = withTiming(0.95, { duration: 100 });
  };
  const handlePressOut = () => {
    if (onPress) scale.value = withTiming(1, { duration: 100 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const containerBg = selected ? 'bg-primary border-primary' : 'bg-surface border-app-border';
  const textColor = selected ? 'text-white' : 'text-text-secondary';

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        className={`px-4 py-2 rounded-full border ${containerBg} flex-row items-center justify-center ${className}`}
      >
        <Text className={`text-sm font-medium ${textColor}`}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default Chip;
