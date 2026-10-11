import React from 'react';
import { Pressable, View, Text, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export interface IconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  size?: number;
  badge?: number;
  color?: string;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({ icon, onPress, size = 48, badge, color, className = '', style }: IconButtonProps) {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withTiming(0.9, { duration: 100 });
  };
  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 100 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{ width: size, height: size, backgroundColor: color || 'rgba(0,0,0,0.05)' }}
        className={`rounded-full items-center justify-center ${className}`}
      >
        {icon}
        {badge !== undefined && badge > 0 && (
          <View className="absolute top-0 right-0 bg-error rounded-full min-w-[18px] h-[18px] items-center justify-center px-1 border border-white">
            <Text className="text-white text-[10px] font-bold">{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

export default IconButton;
