import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';

export interface CardProps {
  children: React.ReactNode;
  padding?: number; // Tailwind spacing scale like 2, 4, 6 or exact pixels if used in inline style
  elevation?: 'sm' | 'md' | 'lg';
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export function Card({
  children,
  padding = 4, // using tailwind p-4 by default
  elevation = 'sm',
  className = '',
  style,
}: CardProps) {
  let shadowClass = '';
  switch (elevation) {
    case 'sm':
      shadowClass = 'shadow-sm elevation-2'; // Adding explicit elevation just in case
      break;
    case 'md':
      shadowClass = 'shadow-md elevation-4';
      break;
    case 'lg':
      shadowClass = 'shadow-lg elevation-6';
      break;
  }

  // padding will be handled dynamically or via className. 
  // Let's assume `padding` is used for tailwind class `p-${padding}` 
  // NativeWind handles dynamic strings poorly sometimes, so it's safer to use inline style for arbitrary padding 
  // or a preset of classes. We will use `style={{ padding }}` if padding is a number, otherwise just p-4.
  // Wait, if the user provides `padding={16}`, it's 16 pixels.
  
  return (
    <View
      className={`bg-surface-elevated rounded-2xl ${shadowClass} ${className}`}
      style={[{ padding }, style]}
    >
      {children}
    </View>
  );
}

export default Card;
