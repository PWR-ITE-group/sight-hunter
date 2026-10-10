import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

export interface ProgressBarProps {
  progress: number; // 0 to 1
  color?: string;
  animated?: boolean;
  height?: number;
}

export function ProgressBar({
  progress,
  color = '#208AEF', // primary
  animated = true,
  height = 8,
}: ProgressBarProps) {
  const width = useSharedValue(0);

  useEffect(() => {
    const targetWidth = Math.max(0, Math.min(100, progress * 100));
    if (animated) {
      width.value = withTiming(targetWidth, {
        duration: 300,
        easing: Easing.inOut(Easing.ease),
      });
    } else {
      width.value = targetWidth;
    }
  }, [progress, animated, width]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: `${width.value}%`,
      backgroundColor: color,
      height,
      borderRadius: height / 2,
    };
  });

  return (
    <View style={{ height, borderRadius: height / 2 }} className="w-full bg-slate-200 overflow-hidden">
      <Animated.View style={animatedStyle} />
    </View>
  );
}
