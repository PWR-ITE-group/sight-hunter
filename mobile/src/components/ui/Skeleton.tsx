import React, { useEffect } from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, withSequence, Easing } from 'react-native-reanimated';

export interface SkeletonProps {
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({ className = '', style }: SkeletonProps) {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // Size and shape come from className on a core View; the animation wraps it.
  return (
    <Animated.View style={animatedStyle}>
      <View style={style} className={`bg-app-border rounded-md overflow-hidden ${className}`} />
    </Animated.View>
  );
}

export default Skeleton;
