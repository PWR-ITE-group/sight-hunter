import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Typography } from '../../constants/typography';
import { Spacing, BorderRadius } from '../../constants/spacing';
import { Colors } from '../../constants/colors';

export interface RiddleCardProps {
  task: {
    riddle: string;
    archival_photo_url: string | null;
    reward_points: number;
    reward_xp: number;
  };
}

export default function RiddleCard({ task }: RiddleCardProps) {
  return (
    <Card style={styles.card}>
      {task.archival_photo_url && (
        <Image
          source={{ uri: task.archival_photo_url }}
          style={styles.image}
          resizeMode="cover"
        />
      )}
      <Text style={styles.riddleText}>{task.riddle}</Text>
      <View style={styles.badgesRow}>
        <Badge value={task.reward_points} type="points" />
        <Badge value={task.reward_xp} type="xp" />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  riddleText: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
});
