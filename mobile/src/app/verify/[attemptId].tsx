import React, { useEffect, useRef } from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import VerifySteps, { type VerifyStepsProps } from '../../components/game/VerifySteps';
import { Button } from '../../components/ui/Button';
import { ErrorBanner, errorMessage } from '../../components/ui/ErrorBanner';
import { useVerificationFlow, type VerificationStep } from '../../hooks/useVerificationFlow';
import { useGameStore } from '../../store/gameStore';
import { queryKeys } from '../../api/hooks/queryKeys';

type UiStatus = VerifyStepsProps['status'];

/** Flow step → what the player sees. The geofence runs when the attempt is created. */
function toUi(step: VerificationStep, verdict?: 'accepted' | 'rejected' | string): { status: UiStatus; gps: number; clip: number } {
  switch (step) {
    case 'idle':
    case 'creating':
      return { status: 'gps_check', gps: 0.5, clip: 0 };
    case 'uploading':
      return { status: 'clip_check', gps: 1, clip: 0.25 };
    case 'submitting':
      return { status: 'clip_check', gps: 1, clip: 0.5 };
    case 'polling':
      return { status: 'clip_check', gps: 1, clip: 0.8 };
    case 'done':
      return { status: verdict === 'accepted' ? 'accepted' : 'rejected', gps: 1, clip: 1 };
    case 'failed':
    default:
      return { status: 'gps_check', gps: 0, clip: 0 };
  }
}

export default function VerifyScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const activeRoundId = useGameStore((s) => s.activeRoundId);
  const lastPhotoUri = useGameStore((s) => s.lastPhotoUri);
  const clearRound = useGameStore((s) => s.clearRound);
  const { start, step, attempt, error } = useVerificationFlow(activeRoundId);
  const started = useRef(false);

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      start();
    }
  }, [start]);

  const ui = toUi(step, attempt?.status);

  // A verdict changes the map, the balance and the feed.
  useEffect(() => {
    if (step === 'done') {
      queryClient.invalidateQueries({ queryKey: ['places'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.me });
      queryClient.invalidateQueries({ queryKey: queryKeys.reelFeed });
    }
  }, [step, queryClient]);

  const showReward = () => {
    router.replace({
      pathname: '/result',
      params: {
        pointsAwarded: String(attempt?.points_awarded ?? 0),
        xpAwarded: String(attempt?.xp_awarded ?? 0),
        ...(attempt?.reel_id ? { reelId: attempt.reel_id } : {}),
      },
    });
  };

  const retry = () => router.replace('/camera');
  const giveUp = () => {
    clearRound();
    router.replace('/(tabs)');
  };

  const attemptsLeft = attempt?.attempts_left ?? null;
  const noAttemptsLeft = ui.status === 'rejected' && attemptsLeft === 0;

  return (
    <View className="flex-1 bg-paper p-6 justify-center">
      <View className="bg-white p-6 rounded-3xl shadow-sm border border-app-border items-center">
        {lastPhotoUri && (
          <Image
            source={{ uri: lastPhotoUri }}
            style={{ width: 120, height: 120, borderRadius: 16, marginBottom: 24 }}
            contentFit="cover"
          />
        )}
        <Text className="text-2xl font-bold text-app-text mb-4">Weryfikacja</Text>

        {step === 'failed' ? (
          <View className="w-full">
            <ErrorBanner message={errorMessage(error)} />
            <View className="mt-6 gap-y-3">
              <Button title="Zrób zdjęcie ponownie" variant="primary" onPress={retry} />
              <Button title="Wróć do zadania" variant="ghost" onPress={() => router.back()} />
            </View>
          </View>
        ) : (
          <VerifySteps
            status={ui.status}
            gpsProgress={ui.gps}
            clipProgress={ui.clip}
            reason={attempt?.reason ?? null}
            wrongPlaceName={attempt?.wrong_place_name ?? null}
          />
        )}

        {ui.status === 'accepted' && (
          <View className="w-full mt-6">
            <Button title="Zobacz nagrodę" variant="primary" onPress={showReward} />
          </View>
        )}

        {ui.status === 'rejected' && (
          <View className="w-full mt-6">
            {noAttemptsLeft ? (
              <>
                <Text className="text-center text-text-secondary mb-4">To były wszystkie próby w tej rundzie.</Text>
                <Button title="Wróć do mapy" variant="primary" onPress={giveUp} />
              </>
            ) : (
              <>
                <Button title="Spróbuj ponownie" variant="primary" onPress={retry} />
                {attemptsLeft !== null && (
                  <Text className="text-center text-text-secondary mt-4">Pozostało prób: {attemptsLeft}</Text>
                )}
              </>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
