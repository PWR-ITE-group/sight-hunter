import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import ScreenWrapper from '../../components/layout/ScreenWrapper';
import Header from '../../components/layout/Header';
import RiddleCard from '../../components/game/RiddleCard';
import HintDialog from '../../components/game/HintDialog';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorBanner, errorMessage } from '../../components/ui/ErrorBanner';
import { ShareSheet } from '../../components/reels/ShareSheet';
import { useTask, useStartRound } from '../../api/hooks/useTask';
import { useHint } from '../../api/hooks/useRound';
import { queryKeys } from '../../api/hooks/queryKeys';
import { getShareLink } from '../../api/endpoints/tasks';
import { ApiClientError } from '../../api/client';
import { components } from '../../api/schema';
import { Spacing, BorderRadius } from '../../constants/spacing';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Config } from '../../constants/config';

type Round = components['schemas']['Round'];

export default function TaskScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { taskId } = useLocalSearchParams<{ taskId: string }>();

  const task = useTask(taskId ?? null);
  const startRound = useStartRound();
  const hint = useHint();

  const [round, setRound] = useState<Round | null>(null);
  const [alreadyFound, setAlreadyFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hintDialog, setHintDialog] = useState<{ text: string; used: number; reward: number } | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  // Opening the task starts (or resumes) its round; a repeat is safe on the server.
  useEffect(() => {
    if (!taskId || round || startRound.isPending || alreadyFound) return;
    startRound
      .mutateAsync(taskId)
      .then(setRound)
      .catch((e: unknown) => {
        if (e instanceof ApiClientError && e.code === 'round_not_active') {
          setAlreadyFound(true);
        } else {
          setError(errorMessage(e));
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  const revealed = round?.hints ?? [];
  const hintsTotal = task.data ? Math.min(task.data.hints_total, Config.MAX_HINTS_PER_ROUND) : 0;
  const canTakeHint = !!round && round.status === 'active' && revealed.length < hintsTotal;

  const handleHint = async () => {
    if (!round) return;
    setError(null);
    try {
      const res = await hint.mutateAsync({ roundId: round.id });
      setRound({
        ...round,
        hints: [...revealed, res.hint_text],
        hints_used: res.hints_used,
        reward_points: res.reward_points,
      });
      setHintDialog({ text: res.hint_text, used: res.hints_used, reward: res.reward_points });
      queryClient.invalidateQueries({ queryKey: queryKeys.task(round.task_id) });
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const handleShare = async () => {
    if (!taskId) return;
    try {
      const { url } = await getShareLink(taskId);
      setShareUrl(url);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  if (task.isLoading) {
    return (
      <ScreenWrapper padding={0}>
        <Header title="Zadanie" showBack />
        <LoadingSpinner className="flex-1" size={40} />
      </ScreenWrapper>
    );
  }

  if (task.error || !task.data) {
    return (
      <ScreenWrapper>
        <Header title="Zadanie" showBack />
        <ErrorBanner message={errorMessage(task.error)} onRetry={() => task.refetch()} className="mt-4" />
      </ScreenWrapper>
    );
  }

  const data = task.data;
  const rewardPoints = round?.reward_points ?? data.reward_points;

  return (
    <ScreenWrapper padding={0}>
      <Header title="Zadanie" showBack />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} className="mb-4" />}

        <RiddleCard
          task={{
            riddle: data.riddle,
            archival_photo_url: data.archival_photo_url ?? null,
            reward_points: rewardPoints,
            reward_xp: data.reward_xp,
          }}
        />

        {alreadyFound && (
          <View style={styles.foundBox}>
            <Text style={styles.foundText}>✅ To miejsce już odkryłeś. Jego historia czeka w zakładce Odkrycia.</Text>
          </View>
        )}

        {hintsTotal > 0 && !alreadyFound && (
          <View style={styles.hintsSection}>
            <Text style={styles.sectionTitle}>Wskazówki</Text>
            {revealed.map((text, index) => (
              <View key={index} style={styles.hintWrapper}>
                <View style={styles.unlockedHintBox}>
                  <Text style={styles.unlockedHintTitle}>💡 Wskazówka {index + 1}</Text>
                  <Text style={styles.unlockedHintText}>{text}</Text>
                </View>
              </View>
            ))}
            {canTakeHint && (
              <View style={styles.hintWrapper}>
                <Button
                  title={`💡 Wskazówka ${revealed.length + 1} z ${hintsTotal}`}
                  variant="outline"
                  onPress={handleHint}
                  loading={hint.isPending}
                />
                <Text style={styles.hintNote}>Każda wskazówka zmniejsza nagrodę w punktach o 25%.</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.actionsSection}>
          <Button
            title="📷 Zrób zdjęcie"
            variant="primary"
            onPress={() => router.push('/camera')}
            disabled={!round || round.status !== 'active' || alreadyFound}
            loading={startRound.isPending}
            style={styles.actionButton}
          />
          <Button title="🔗 Udostępnij" variant="outline" onPress={handleShare} style={styles.actionButton} />
        </View>
      </ScrollView>

      <HintDialog
        visible={!!hintDialog}
        hintText={hintDialog?.text ?? ''}
        hintsUsed={hintDialog?.used ?? 0}
        maxHints={hintsTotal}
        newRewardPoints={hintDialog?.reward ?? rewardPoints}
        onClose={() => setHintDialog(null)}
      />

      <ShareSheet url={shareUrl ?? ''} visible={!!shareUrl} onClose={() => setShareUrl(null)} />
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
  hintNote: {
    ...Typography.caption,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.xs,
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
  foundBox: {
    marginTop: Spacing.lg,
    backgroundColor: '#22C55E20',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  foundText: {
    ...Typography.body,
    color: Colors.success,
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
