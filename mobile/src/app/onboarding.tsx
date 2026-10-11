import React, { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { HowItWorksCard } from '../components/reels/HowItWorksCard';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/authStore';

export default function OnboardingScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);
  const { height: windowHeight } = useWindowDimensions();
  const [height, setHeight] = useState(windowHeight);

  const finish = () => {
    if (user) {
      completeOnboarding(user.id);
      router.replace('/(tabs)');
    }
  };

  return (
    <View className="flex-1" onLayout={(event) => setHeight(event.nativeEvent.layout.height)}>
      {user && (
        <HowItWorksCard key={user.id} height={height} onComplete={finish} />
      )}
    </View>
  );
}
