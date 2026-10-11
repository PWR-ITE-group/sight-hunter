import React from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PlayCircle } from 'lucide-react-native';
import RewardAnimation from '../components/game/RewardAnimation';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Colors } from '../constants/colors';
import { useGameStore } from '../store/gameStore';
import type { ResultScreenParams } from '../types/navigation';

export default function ResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<ResultScreenParams>();
  const clearRound = useGameStore((s) => s.clearRound);

  const points = Number(params.pointsAwarded ?? 0);
  const xp = Number(params.xpAwarded ?? 0);
  const reelId = params.reelId;

  const searchNext = () => {
    clearRound();
    router.replace('/next');
  };

  return (
    <View className="flex-1 bg-primary-light p-6 justify-center">
      <Text className="text-4xl font-bold text-app-text text-center mb-2">Gratulacje!</Text>
      <Text className="text-lg text-text-secondary text-center mb-8">Znalazłeś kolejne miejsce</Text>

      <RewardAnimation points={points} xp={xp} />

      {reelId && (
        <View className="my-8">
          <Card padding={16} elevation="md">
            <Text className="text-xs font-bold text-primary uppercase mb-1">Odblokowano!</Text>
            <Text className="text-base font-bold text-app-text mb-4">Historia tego miejsca czeka na Ciebie</Text>
            <Button
              title="Obejrzyj historię"
              variant="outline"
              icon={<PlayCircle size={20} color={Colors.primary} />}
              onPress={() => router.push(`/reel/${reelId}`)}
            />
          </Card>
        </View>
      )}

      <View className="mt-auto">
        <Button title="Szukaj dalej" variant="primary" size="lg" onPress={searchNext} />
      </View>
    </View>
  );
}
