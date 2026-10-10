import React from 'react';
import { View, Text, ViewStyle, StyleProp } from 'react-native';
import { Inbox, type LucideIcon } from 'lucide-react-native';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  message?: string;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({
  icon: Icon = Inbox,
  title = 'Nic tu jeszcze nie ma',
  message = 'Gdy pojawią się nowe elementy, zobaczysz je tutaj.',
  className = '',
  style,
}: EmptyStateProps) {
  return (
    <View style={style} className={`flex-1 items-center justify-center p-8 ${className}`}>
      <View className="w-20 h-20 rounded-full bg-paper items-center justify-center mb-6">
        <Icon size={40} color="#8a948e" strokeWidth={1.5} />
      </View>
      <Text className="text-xl font-bold text-app-text text-center mb-2">
        {title}
      </Text>
      <Text className="text-base text-text-secondary text-center">
        {message}
      </Text>
    </View>
  );
}

export default EmptyState;
