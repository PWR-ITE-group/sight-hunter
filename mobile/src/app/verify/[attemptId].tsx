import React, { useState, useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { VerifySteps, VerifyStatus } from '../../components/game/VerifySteps';
import { Button } from '../../components/ui/Button';

export default function VerifyScreen() {
  const { attemptId } = useLocalSearchParams();
  const router = useRouter();

  const [status, setStatus] = useState<VerifyStatus>('uploading');
  const [gpsProgress, setGpsProgress] = useState(0);
  const [clipProgress, setClipProgress] = useState(0);

  // Mock verification process
  useEffect(() => {
    let timer1: ReturnType<typeof setTimeout>, timer2: ReturnType<typeof setTimeout>, timer3: ReturnType<typeof setTimeout>;

    // Simulate GPS progress
    timer1 = setTimeout(() => {
      setStatus('gps_check');
      setGpsProgress(0.5);
    }, 1000);

    timer2 = setTimeout(() => {
      setGpsProgress(1);
      setStatus('clip_check');
      setClipProgress(0.2);
    }, 2500);

    // Simulate CLIP progress and result
    timer3 = setTimeout(() => {
      setClipProgress(1);
      // Hardcoded success for demo
      setStatus('accepted');
    }, 4500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return (
    <View className="flex-1 bg-surface p-6 justify-center">
      <View className="bg-white p-6 rounded-3xl shadow-sm border border-app-border items-center">
        <Animated.Image 
          source={{ uri: 'https://picsum.photos/400/300' }} 
          style={{ width: 120, height: 120, borderRadius: 16, marginBottom: 24 }}
          sharedTransitionTag="photo"
        />
        <Text className="text-2xl font-bold text-app-text mb-8">Weryfikacja</Text>
        
        <VerifySteps 
          status={status} 
          gpsProgress={gpsProgress}
          clipProgress={clipProgress}
        />

        {status === 'accepted' && (
          <View className="w-full mt-10">
            <Button 
              title="Zobacz nagrodę" 
              variant="primary" 
              onPress={() => router.push('/result')} 
            />
          </View>
        )}

        {status === 'rejected' && (
          <View className="w-full mt-10">
            <Button 
              title="Spróbuj ponownie" 
              variant="primary" 
              onPress={() => router.back()} 
            />
            <Text className="text-center text-text-secondary mt-4">Pozostało prób: 2</Text>
          </View>
        )}
      </View>
    </View>
  );
}
