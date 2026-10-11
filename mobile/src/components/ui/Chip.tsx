import React from 'react';
import { Text, ViewStyle, StyleProp } from 'react-native';
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { AnimatedPressable } from './interop';


export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export function Chip({
  label,
  selected = false,
  onPress,
  className = '',
  style,
}: ChipProps) {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withTiming(0.95, { duration: 100 });
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      scale.value = withTiming(1, { duration: 100 });
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const containerBg = selected ? 'bg-primary border-primary' : 'bg-transparent border-app-border';
  const textColor = selected ? 'text-white' : 'text-text-secondary';

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle, style]}
      className={`px-4 py-2 rounded-full border ${containerBg} flex-row items-center justify-center ${className}`}
    >
      <Text className={`text-sm font-medium ${textColor}`}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}
