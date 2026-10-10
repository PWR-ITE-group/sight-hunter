import React, { useState } from 'react';
import { View, Text, StyleSheet, Share, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
// import { useTask, useStartRound } from '../../api/hooks/useTask';
// import { useHint } from '../../api/hooks/useRound';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import Header from '../../components/layout/Header';
import RiddleCard from '../../components/game/RiddleCard';
import HintDialog from '../../components/game/HintDialog';
import Button from '../../components/ui/Button';
import { Spacing, BorderRadius } from '../../constants/spacing';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

const MOCK_TASK = {
  id: '1',
  riddle: 'Znajdź kościół z dwoma wysokimi wieżami na Ostrowie Tumskim',
  archival_photo_url: null,
  reward_points: 100,
  reward_xp: 50,
  hints: ['Szukaj na wyspie', 'To katedra', 'Katedra św. Jana Chrzciciela'],
};

export default function TaskScreen() {
  const router = useRouter();
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  
  // Real hooks commented out / partially used for mock logic
  // const { data: taskData } = useTask(taskId);
  // const { mutate: startRound } = useStartRound();
  // const { mutate: getHint } = useHint();

  const [hintsUsed, setHintsUsed] = useState(0);
  const [showHintDialog, setShowHintDialog] = useState(false);
  const [currentHintText, setCurrentHintText] = useState('');

  const task = MOCK_TASK; // fallback to MOCK_TASK

  const handleUnlockHint = (index: number) => {
    // Here we would call the getHint mutation
    const text = task.hints[index];
    setCurrentHintText(text);
    setHintsUsed(index + 1);
    setShowHintDialog(true);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Pomożesz mi rozwiązać zagadkę w Sight Hunter?\n\n"${task.riddle}"`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const newRewardPoints = Math.max(0, task.reward_points - (hintsUsed * 10));

  return (
    <ScreenWrapper padding={0}>
      <Header title="Zadanie" showBack />
      
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <RiddleCard task={task as any} />

        <View style={styles.hintsSection}>
          <Text style={styles.sectionTitle}>Wskazówki</Text>
          {task.hints.map((hint, index) => {
            const isUnlocked = index < hintsUsed;
            const isNextToUnlock = index === hintsUsed;

            return (
              <View key={index} style={styles.hintWrapper}>
                {isUnlocked ? (
                  <View style={styles.unlockedHintBox}>
                    <Text style={styles.unlockedHintTitle}>💡 Wskazówka {index + 1}</Text>
                    <Text style={styles.unlockedHintText}>{hint}</Text>
                  </View>
                ) : (
                  <Button
                    title={`💡 Wskazówka ${index + 1}`}
                    variant="outline"
                    onPress={() => handleUnlockHint(index)}
                    disabled={!isNextToUnlock}
                  />
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.actionsSection}>
          <Button
            title="📷 Zrób zdjęcie"
            variant="primary"
            onPress={() => router.push('/camera')}
            style={styles.actionButton}
          />
          <Button
            title="🔗 Udostępnij"
            variant="outline"
            onPress={handleShare}
            style={styles.actionButton}
          />
        </View>
      </ScrollView>

      <HintDialog
        visible={showHintDialog}
        hintText={currentHintText}
        hintsUsed={hintsUsed}
        maxHints={task.hints.length}
        newRewardPoints={newRewardPoints}
        onClose={() => setShowHintDialog(false)}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    flexGrow: 1,
  },
  hintsSection: {
    marginTop: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  hintWrapper: {
    marginBottom: Spacing.md,
  },
  unlockedHintBox: {
    backgroundColor: Colors.surfaceElevated,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  unlockedHintTitle: {
    ...Typography.captionBold,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  unlockedHintText: {
    ...Typography.body,
    color: Colors.text,
  },
  actionsSection: {
    marginTop: Spacing.xl,
    gap: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  actionButton: {
    width: '100%',
  },
});
