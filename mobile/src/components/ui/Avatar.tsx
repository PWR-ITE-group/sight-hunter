import React from 'react';
import { View, Text } from 'react-native';
import { Image } from 'expo-image';

export interface AvatarProps {
  uri?: string | null;
  nickname?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Avatar({ uri, nickname, size = 'md', className = '' }: AvatarProps) {
  let sizePx = 48;
  let textClass = 'text-lg';

  switch (size) {
    case 'sm':
      sizePx = 32;
      textClass = 'text-sm';
      break;
    case 'md':
      sizePx = 48;
      textClass = 'text-lg';
      break;
    case 'lg':
      sizePx = 80;
      textClass = 'text-3xl';
      break;
  }

  const initials = nickname
    ? nickname.substring(0, 2).toUpperCase()
    : '?';

  return (
    <View
      className={`rounded-full overflow-hidden items-center justify-center bg-primary-light ${className}`}
      style={{ width: sizePx, height: sizePx }}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: sizePx, height: sizePx }}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <Text className={`font-bold text-primary ${textClass}`}>
          {initials}
        </Text>
      )}
    </View>
  );
}
