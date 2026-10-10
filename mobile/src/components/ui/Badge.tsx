import React from 'react';
import { View, Text } from 'react-native';

export interface BadgeProps {
  value: number | string;
  type: 'xp' | 'points' | 'status';
  size?: 'sm' | 'md';
  className?: string;
  statusType?: 'success' | 'error' | 'warning' | 'neutral'; // Only for status type
}

export function Badge({
  value,
  type,
  size = 'md',
  className = '',
  statusType = 'success',
}: BadgeProps) {
  let bgColorClass = '';
  let textColorClass = '';
  let icon = '';

  if (type === 'xp') {
    bgColorClass = 'bg-warning/20'; // Using opacity from tailwind if supported, else custom. We can use bg-[#F59E0B20] or bg-yellow-100
    // Actually, NativeWind v4 supports opacity modifiers like `bg-warning/20` or we can just use `bg-warning` with 20% opacity. 
    // To be safe with NativeWind custom colors:
    bgColorClass = 'bg-[#F59E0B20]'; 
    textColorClass = 'text-warning';
    icon = '⭐';
  } else if (type === 'points') {
    bgColorClass = 'bg-[#208AEF20]'; // primary with opacity
    textColorClass = 'text-primary';
    icon = '💎';
  } else if (type === 'status') {
    switch (statusType) {
      case 'success':
        bgColorClass = 'bg-[#22C55E20]';
        textColorClass = 'text-success';
        break;
      case 'error':
        bgColorClass = 'bg-[#EF444420]';
        textColorClass = 'text-error';
        break;
      case 'warning':
        bgColorClass = 'bg-[#F59E0B20]';
        textColorClass = 'text-warning';
        break;
      default:
        bgColorClass = 'bg-app-border';
        textColorClass = 'text-text-secondary';
        break;
    }
  }

  let sizeContainerClass = '';
  let sizeTextClass = '';

  if (size === 'sm') {
    sizeContainerClass = 'px-2 py-0.5 rounded-md';
    sizeTextClass = 'text-xs';
  } else {
    sizeContainerClass = 'px-3 py-1 rounded-lg';
    sizeTextClass = 'text-sm font-semibold';
  }

  return (
    <View
      className={`flex-row items-center justify-center ${sizeContainerClass} ${bgColorClass} ${className}`}
    >
      {icon ? <Text className={`${sizeTextClass} mr-1`}>{icon}</Text> : null}
      <Text className={`${sizeTextClass} ${textColorClass}`}>{value}</Text>
    </View>
  );
}

export default Badge;
