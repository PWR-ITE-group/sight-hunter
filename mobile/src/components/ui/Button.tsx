import React from 'react';
import { Pressable, Text, ActivityIndicator, View, ViewStyle, StyleProp } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * The press animation lives on an outer Animated.View (plain `style`); every `className` sits on
 * core RN components, which is the only place NativeWind applies it.
 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  className = '',
  style,
}: ButtonProps) {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSpring(0.95, { damping: 15, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  let containerClasses = '';
  let textClasses = '';
  let spinnerColor = '#FFFFFF';
  switch (variant) {
    case 'primary':
      containerClasses = 'bg-primary border border-primary';
      textClasses = 'text-white font-semibold';
      break;
    case 'secondary':
      containerClasses = 'bg-secondary border border-secondary';
      textClasses = 'text-white font-semibold';
      break;
    case 'outline':
      containerClasses = 'bg-surface border border-app-border';
      textClasses = 'text-primary font-semibold';
      spinnerColor = Colors.primary;
      break;
    case 'ghost':
      containerClasses = 'bg-transparent border border-transparent';
      textClasses = 'text-primary font-semibold';
      spinnerColor = Colors.primary;
      break;
  }

  let sizeClasses = '';
  let textSizeClasses = '';
  switch (size) {
    case 'sm':
      sizeClasses = 'px-3 py-2';
      textSizeClasses = 'text-sm';
      break;
    case 'md':
      sizeClasses = 'px-4 py-3';
      textSizeClasses = 'text-base';
      break;
    case 'lg':
      sizeClasses = 'px-6 py-4';
      textSizeClasses = 'text-lg';
      break;
  }

  const isDisabled = disabled || loading;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        className={`flex-row items-center justify-center rounded-2xl overflow-hidden ${containerClasses} ${sizeClasses} ${isDisabled ? 'opacity-50' : ''} ${className}`}
      >
        {loading ? (
          <ActivityIndicator color={spinnerColor} size="small" />
        ) : (
          <>
            {icon && <View className="mr-2">{icon}</View>}
            <Text className={`${textClasses} ${textSizeClasses} text-center`}>{title}</Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

export default Button;
