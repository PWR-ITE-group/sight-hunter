import { ReactNode } from 'react';
import { View, ScrollView, StatusBar, ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';

interface ScreenWrapperProps {
  children: ReactNode;
  padding?: number;
  backgroundColor?: string;
  withScrollView?: boolean;
  safeAreaEdges?: Edge[];
  style?: ViewStyle;
  className?: string;
}

export default function ScreenWrapper({
  children,
  padding = 16,
  backgroundColor = Colors.background,
  withScrollView = false,
  safeAreaEdges = ['top'],
  style,
  className = '',
}: ScreenWrapperProps) {
  const content = withScrollView ? (
    <ScrollView
      className="flex-1"
      contentContainerStyle={[{ padding }, style]}
      contentContainerClassName="grow"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View className={`flex-1 ${className}`}>{children}</View>
    </ScrollView>
  ) : (
    <View style={[{ padding }, style]} className={`flex-1 ${className}`}>
      {children}
    </View>
  );

  return (
    <SafeAreaView
      edges={safeAreaEdges}
      style={{ backgroundColor }}
      className="flex-1"
    >
      <StatusBar barStyle="dark-content" backgroundColor={backgroundColor} />
      {content}
    </SafeAreaView>
  );
}
