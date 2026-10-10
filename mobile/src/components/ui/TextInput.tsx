import React, { useState } from 'react';
import {
  TextInput as RNTextInput,
  View,
  Text,
  KeyboardTypeOptions,
  Pressable,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

export interface TextInputProps {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  error?: string;
  secureTextEntry?: boolean;
  icon?: React.ReactNode;
  keyboardType?: KeyboardTypeOptions;
  className?: string;
}

export function TextInput({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry = false,
  icon,
  keyboardType = 'default',
  className = '',
}: TextInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(!secureTextEntry);
  
  const animatedFocus = useSharedValue(value ? 1 : 0);

  React.useEffect(() => {
    if (isFocused || value) {
      animatedFocus.value = withTiming(1, { duration: 150 });
    } else {
      animatedFocus.value = withTiming(0, { duration: 150 });
    }
  }, [isFocused, value, animatedFocus]);

  const labelAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(animatedFocus.value, [0, 1], [0, -22]);
    const scale = interpolate(animatedFocus.value, [0, 1], [1, 0.85]);
    return {
      transform: [
        { translateY },
        { scale },
        { translateX: interpolate(animatedFocus.value, [0, 1], [0, -4]) },
      ],
    };
  });

  const borderColor = error
    ? 'border-error'
    : isFocused
    ? 'border-primary'
    : 'border-app-border';

  return (
    <View className={`w-full mb-4 ${className}`}>
      <View
        className={`h-14 flex-row items-center px-4 rounded-xl border bg-surface-elevated ${borderColor}`}
      >
        {icon && <View className="mr-2">{icon}</View>}
        
        <View className="flex-1 relative justify-center h-full">
          <Animated.View
            className="absolute left-0 pointer-events-none"
            style={labelAnimatedStyle}
          >
            <Text
              className={`${
                error
                  ? 'text-error'
                  : isFocused
                  ? 'text-primary'
                  : 'text-text-secondary'
              } bg-surface-elevated px-1`}
            >
              {label}
            </Text>
          </Animated.View>

          <RNTextInput
            className="flex-1 text-app-text text-base mt-2"
            value={value}
            onChangeText={onChangeText}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={isFocused ? placeholder : ''}
            placeholderTextColor="#8a948e"
            secureTextEntry={secureTextEntry && !isPasswordVisible}
            keyboardType={keyboardType}
            autoCapitalize="none"
          />
        </View>

        {secureTextEntry && (
          <Pressable
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            className="ml-2 p-1"
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={24}
              color="#5d6862"
            />
          </Pressable>
        )}
      </View>
      {error ? (
        <Text className="text-error text-sm mt-1 ml-1">{error}</Text>
      ) : null}
    </View>
  );
}
