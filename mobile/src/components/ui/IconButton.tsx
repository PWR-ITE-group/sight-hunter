import React from 'react';
import { Pressable, View, Text, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface IconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  size?: number; // Size of the button (width/height)
  badge?: number;
  color?: string; // background color, default transparent or grey
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  icon,
  onPress,
  size = 48,
  badge,
  color,
  className = '',
  style,
}: IconButtonProps) {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withTiming(0.9, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 100 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const backgroundColor = color || 'rgba(0,0,0,0.05)';

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[{ width: size, height: size, backgroundColor }, animatedStyle, style]}
      className={`rounded-full items-center justify-center ${className}`}
    >
      {icon}
      
      {badge !== undefined && badge > 0 && (
        <View className="absolute top-0 right-0 bg-error rounded-full min-w-[18px] h-[18px] items-center justify-center px-1 border border-white">
          <Text className="text-white text-[10px] font-bold">
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      )}
    </AnimatedPressable>
  );
}
