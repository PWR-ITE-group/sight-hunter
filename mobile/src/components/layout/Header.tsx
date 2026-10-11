import { ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBackPress?: () => void;
  rightAction?: ReactNode;
  className?: string;
}

export default function Header({
  title,
  showBack = false,
  onBackPress,
  rightAction,
  className = '',
}: HeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <View className={`h-14 flex-row items-center px-4 bg-surface-elevated ${className}`}>
      {/* Left slot */}
      <View className="w-11 items-center justify-center">
        {showBack && (
          <Pressable
            onPress={handleBack}
            className="w-11 h-11 items-center justify-center"
            hitSlop={8}
          >
            <Text className="text-[22px] text-app-text">←</Text>
          </Pressable>
        )}
      </View>

      {/* Center */}
      <View className="flex-1 items-center justify-center">
        <Text className="text-lg font-semibold leading-6 text-app-text" numberOfLines={1}>
          {title}
        </Text>
      </View>

      {/* Right slot */}
      <View className="w-11 items-center justify-center">
        {rightAction}
      </View>
    </View>
  );
}
