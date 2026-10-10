import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { NextPlacePicker, NextOption } from '../components/game/NextPlacePicker';
import { Button } from '../components/ui/Button';

export default function NextScreen() {
  const router = useRouter();

  const mockOptions: NextOption[] = [
    {
      taskId: 'task-1',
      type: 'nearest',
      distance: '350 m',
    },
    {
      taskId: 'task-2',
      type: 'popular',
      name: 'Most Grunwaldzki',
      findersCount: 1240,
    },
    {
      taskId: 'task-3',
      type: 'random',
    }
  ];

  return (
    <ScrollView className="flex-1 bg-surface">
      <View className="p-6 pt-12">
        <Text className="text-3xl font-bold text-app-text mb-2">Co dalej?</Text>
        <Text className="text-base text-text-secondary mb-6">Wybierz swój następny cel we Wrocławiu.</Text>
        
        <NextPlacePicker 
          options={mockOptions} 
          onSelect={(taskId) => router.push(`/task/${taskId}` as any)} 
        />
        
        <View className="mt-8">
            <Button title="Wróć do mapy" variant="outline" onPress={() => router.push('/(tabs)' as any)} />
        </View>
      </View>
    </ScrollView>
  );
}
