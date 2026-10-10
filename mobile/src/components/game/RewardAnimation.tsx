import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Badge } from '../ui/Badge';
import Animated, { useSharedValue, withTiming } from 'react-native-reanimated';

export interface RewardAnimationProps {
  points: number;
  xp: number;
}

export function RewardAnimation({ points, xp }: RewardAnimationProps) {
  const [currentPoints, setCurrentPoints] = useState(0);
  const [currentXP, setCurrentXP] = useState(0);

  const pointsValue = useSharedValue(0);
  const xpValue = useSharedValue(0);

  useEffect(() => {
    pointsValue.value = withTiming(points, { duration: 1500 });
    xpValue.value = withTiming(xp, { duration: 1500 });

    const interval = setInterval(() => {
      setCurrentPoints(Math.round(pointsValue.value));
      setCurrentXP(Math.round(xpValue.value));
      
      if (pointsValue.value === points && xpValue.value === xp) {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [points, xp, pointsValue, xpValue]);

  return (
    <View className="flex-row items-center justify-center gap-4 my-8">
      <Animated.View className="items-center">
        <Badge value={currentPoints.toString()} type="points" size="md" />
      </Animated.View>
      <Animated.View className="items-center">
        <Badge value={currentXP.toString()} type="xp" size="md" />
      </Animated.View>
    </View>
  );
}
