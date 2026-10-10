import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { Typography } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { Colors } from '../../constants/colors';

export interface HintDialogProps {
  visible: boolean;
  hintText: string;
  hintsUsed: number;
  maxHints: number;
  newRewardPoints: number;
  onClose: () => void;
}

export default function HintDialog({
  visible,
  hintText,
  hintsUsed,
  maxHints,
  newRewardPoints,
  onClose,
}: HintDialogProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.container}>
        <Text style={styles.icon}>💡</Text>
        
        <Text style={styles.title}>
          Wskazówka {hintsUsed}/{maxHints}
        </Text>
        
        <Text style={styles.hintText}>
          {hintText}
        </Text>
        
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            ⚠️ Nagroda zmniejszona do {newRewardPoints} pkt
          </Text>
        </View>
        
        <Button 
          title="Rozumiem" 
          onPress={onClose} 
          variant="primary" 
          style={styles.button}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingBottom: Spacing.xl,
  },
  icon: {
    fontSize: 60,
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  hintText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  warningContainer: {
    backgroundColor: '#F59E0B20', // warning with opacity
    padding: Spacing.md,
    borderRadius: 8,
    marginBottom: Spacing.xl,
    width: '100%',
  },
  warningText: {
    ...Typography.captionBold,
    color: Colors.warning,
    textAlign: 'center',
  },
  button: {
    width: '100%',
  },
});
