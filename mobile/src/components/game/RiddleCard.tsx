import React from 'react';
import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import Animated from 'react-native-reanimated';
import Card from '../ui/Card';
import Badge from '../ui/Badge';

type Task = {
  id: string;
  riddle: string;
  archival_photo_url: string | null;
  reward_points: number;
  reward_xp: number;
};

type Props = {
  task: Task;
};

export default function RiddleCard({ task }: Props) {
  return (
    <Card elevation="sm" className="mb-6 p-4">
      {task.archival_photo_url && (
        <Animated.Image
          source={{ uri: task.archival_photo_url }}
          style={{ width: '100%', height: 192 }}
          sharedTransitionTag="photo"
          className="rounded-xl mb-4 bg-app-border"
          // @ts-ignore
          contentFit="cover"
        />
      )}
      <Text className="text-lg font-semibold text-app-text mb-4">
        {task.riddle}
      </Text>
      <View className="flex-row gap-3">
        <Badge value={task.reward_points} type="points" size="md" />
        <Badge value={task.reward_xp} type="xp" size="md" />
      </View>
    </Card>
  );
}
