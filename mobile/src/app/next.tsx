import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import NextPlacePicker, { type NextOption } from '../components/game/NextPlacePicker';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorBanner, errorMessage } from '../components/ui/ErrorBanner';
import { useNextPlaces } from '../api/hooks/usePlaces';
import { useLocationStore } from '../store/locationStore';
import { formatDistance } from '../utils/formatters';

export default function NextScreen() {
  const router = useRouter();
  const position = useLocationStore((s) => s.effectivePosition)();
  const next = useNextPlaces(position?.lat ?? null, position?.lng ?? null);

  const options: NextOption[] = [];
  if (next.byMode.nearest) {
    options.push({
      type: 'nearest',
      taskId: next.byMode.nearest.task_id,
      distance: formatDistance(next.byMode.nearest.distance_m),
    });
  }
  if (next.byMode.popular) {
    options.push({ type: 'popular', taskId: next.byMode.popular.task_id });
  }
  if (next.byMode.random) {
    options.push({ type: 'random', taskId: next.byMode.random.task_id });
  }

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerStyle={{ flexGrow: 1 }}>
      <View className="p-6 pt-12 flex-1">
        <Text className="text-3xl font-bold text-app-text mb-2">Co dalej?</Text>
        <Text className="text-base text-text-secondary mb-6">Wybierz swój następny cel we Wrocławiu.</Text>

        {!position ? (
          <Text className="text-text-secondary">Szukam Twojej pozycji…</Text>
        ) : next.isLoading ? (
          <LoadingSpinner className="py-12" size={40} />
        ) : next.error ? (
          <ErrorBanner message={errorMessage(next.error)} onRetry={next.refetch} />
        ) : next.allFound || options.length === 0 ? (
          <EmptyState title="Wszystko odkryte!" message="Znalazłeś już każde miejsce w okolicy. Wróć po nowe zagadki." />
        ) : (
          <NextPlacePicker options={options} onSelect={(taskId) => router.replace(`/task/${taskId}`)} />
        )}

        <View className="mt-8">
          <Button title="Wróć do mapy" variant="outline" onPress={() => router.replace('/(tabs)')} />
        </View>
      </View>
    </ScrollView>
  );
}
