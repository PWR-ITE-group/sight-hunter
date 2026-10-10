import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Card } from '../ui/Card';
import { Typography } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { Colors } from '../../constants/colors';

export interface NextOption {
  type: 'nearest' | 'popular' | 'random';
  taskId: string;
  name?: string;
  distance?: string;
  findersCount?: number;
}

export interface NextPlacePickerProps {
  options: NextOption[];
  onSelect: (taskId: string) => void;
}

export default function NextPlacePicker({ options, onSelect }: NextPlacePickerProps) {
  const getIcon = (type: NextOption['type']) => {
    switch (type) {
      case 'nearest': return '🧭';
      case 'popular': return '🔥';
      case 'random': return '🎲';
    }
  };

  const getTitle = (type: NextOption['type']) => {
    switch (type) {
      case 'nearest': return 'Najbliższe';
      case 'popular': return 'Najpopularniejsze';
      case 'random': return 'Losowe w pobliżu';
    }
  };

  const getSubtitle = (option: NextOption) => {
    if (option.type === 'nearest') {
      return option.name ? `${option.name} • ${option.distance}` : option.distance;
    }
    if (option.type === 'popular') {
      return option.name ? `${option.name} • ${option.findersCount} łowców` : `${option.findersCount} łowców`;
    }
    if (option.type === 'random') {
      return 'Zaskocz mnie!';
    }
    return '';
  };

  return (
    <View style={styles.container}>
      {options.map((option) => (
        <Pressable
          key={option.taskId}
          onPress={() => onSelect(option.taskId)}
          style={({ pressed }) => [
            styles.pressableWrapper,
            pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }
          ]}
        >
          <Card style={styles.card}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>{getIcon(option.type)}</Text>
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.title}>{getTitle(option.type)}</Text>
              <Text style={styles.subtitle}>{getSubtitle(option)}</Text>
            </View>
            <View style={styles.chevronContainer}>
              <Text style={styles.chevron}>›</Text>
            </View>
          </Card>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: Spacing.md,
  },
  pressableWrapper: {
    width: '100%',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  icon: {
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...Typography.bodyBold,
    color: Colors.text,
    marginBottom: 2,
  },
  subtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  chevronContainer: {
    paddingLeft: Spacing.sm,
  },
  chevron: {
    fontSize: 24,
    color: Colors.textTertiary,
    lineHeight: 24,
  },
});
