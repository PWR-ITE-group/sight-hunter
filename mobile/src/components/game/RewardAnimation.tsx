import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Badge } from '../ui/Badge';
import { Spacing } from '../../constants/spacing';

export interface RewardAnimationProps {
  points: number;
  xp: number;
}

export default function RewardAnimation({ points, xp }: RewardAnimationProps) {
  const [currentPoints, setCurrentPoints] = useState(0);
  const [currentXp, setCurrentXp] = useState(0);

  useEffect(() => {
    const duration = 1500; // 1.5 seconds
    const intervalTime = 50;
    const steps = duration / intervalTime;
    
    const pointsStep = points / steps;
    const xpStep = xp / steps;
    
    let currentStep = 0;
    
    const interval = setInterval(() => {
      currentStep += 1;
      
      if (currentStep >= steps) {
        setCurrentPoints(points);
        setCurrentXp(xp);
        clearInterval(interval);
      } else {
        setCurrentPoints(Math.floor(pointsStep * currentStep));
        setCurrentXp(Math.floor(xpStep * currentStep));
      }
    }, intervalTime);
    
    return () => clearInterval(interval);
  }, [points, xp]);

  return (
    <View style={styles.container}>
      <Badge value={`${currentPoints} pkt`} type="points" size="md" />
      <Badge value={`${currentXp} XP`} type="xp" size="md" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
    marginVertical: Spacing.xl,
  },
});
