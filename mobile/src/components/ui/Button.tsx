import React from 'react';
import { Pressable, Text, ActivityIndicator, ViewStyle, StyleProp } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
    scale.value = withSpring(0.95, { damping: 15, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const baseContainerClasses = 'flex-row items-center justify-center rounded-xl overflow-hidden';
  
  let variantContainerClasses = '';
  let variantTextClasses = '';
  let spinnerColor = '';

  switch (variant) {
    case 'primary':
      variantContainerClasses = 'bg-primary border border-primary';
      variantTextClasses = 'text-white font-semibold';
      spinnerColor = '#FFFFFF';
      break;
    case 'secondary':
      variantContainerClasses = 'bg-secondary border border-secondary';
      variantTextClasses = 'text-white font-semibold';
      spinnerColor = '#FFFFFF';
      break;
    case 'outline':
      variantContainerClasses = 'bg-transparent border-2 border-primary';
      variantTextClasses = 'text-primary font-semibold';
      spinnerColor = '#208AEF'; // primary color
      break;
    case 'ghost':
      variantContainerClasses = 'bg-transparent border-transparent';
      variantTextClasses = 'text-primary font-semibold';
      spinnerColor = '#208AEF';
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
  const containerDisabledClasses = isDisabled ? 'opacity-50' : 'opacity-100';

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      style={[animatedStyle, style]}
      className={`${baseContainerClasses} ${variantContainerClasses} ${sizeClasses} ${containerDisabledClasses} ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} size="small" />
      ) : (
        <>
          {icon && <Animated.View className="mr-2">{icon}</Animated.View>}
          <Text className={`${variantTextClasses} ${textSizeClasses} text-center`}>
            {title}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
}
