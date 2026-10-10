import { useCallback, useEffect, useRef, useState } from 'react';
import { Config } from '../constants/config';
import { useLocationStore } from '../store/locationStore';
import { useGameStore } from '../store/gameStore';
import { useCreateAttempt } from '../api/hooks/useRound';
import { useSubmitAttempt, usePollAttempt } from '../api/hooks/useAttempt';
import { usePhotoUpload } from './usePhotoUpload';
import { ApiClientError } from '../api/client';

export type VerificationStep =
  | 'idle'
  | 'creating'
  | 'uploading'
  | 'submitting'
  | 'polling'
  | 'done'
  | 'failed';

/**
 * The async verification loop from the contract:
 * create attempt (geofence) → PUT photo to storage → submit → poll until a verdict.
 */
export function useVerificationFlow(roundId: string | null) {
  const [step, setStep] = useState<VerificationStep>('idle');
  const [flowError, setFlowError] = useState<ApiClientError | Error | null>(null);

  const effectivePosition = useLocationStore((s) => s.effectivePosition);
  const lastPhotoUri = useGameStore((s) => s.lastPhotoUri);
  const demoMode = useGameStore((s) => s.demoMode);
  const activeAttemptId = useGameStore((s) => s.activeAttemptId);

  const createAttempt = useCreateAttempt();
  const { upload } = usePhotoUpload();
  const submitAttempt = useSubmitAttempt();
  const pollAttemptQuery = usePollAttempt(step === 'polling' ? activeAttemptId : null);

  const verdict = pollAttemptQuery.data?.status;
  const currentStep: VerificationStep =
    step === 'polling' && (verdict === 'accepted' || verdict === 'rejected') ? 'done' : step;

  // The worker normally answers within seconds. If it is down or the network keeps failing,
  // stop waiting instead of leaving the player on a frozen progress bar.
  const pollingSince = useRef<number | null>(null);
  const pollDeadlineMs = Config.ATTEMPT_POLL_MAX_RETRIES * Config.ATTEMPT_POLL_INTERVAL_MS;
  useEffect(() => {
    if (step !== 'polling') {
      pollingSince.current = null;
      return;
    }
    pollingSince.current ??= Date.now();
    const tooLong = Date.now() - pollingSince.current > pollDeadlineMs;
    const keepsFailing = pollAttemptQuery.isError && pollAttemptQuery.failureCount >= 3;
    if (verdict === 'accepted' || verdict === 'rejected') return;
    if (tooLong || keepsFailing) {
      setFlowError(
        keepsFailing
          ? new Error('Nie udało się sprawdzić wyniku. Sprawdź połączenie i spróbuj ponownie.')
          : new Error('Weryfikacja trwa zbyt długo. Spróbuj ponownie za chwilę.')
      );
      setStep('failed');
    }
  }, [step, verdict, pollDeadlineMs, pollAttemptQuery.isError, pollAttemptQuery.failureCount, pollAttemptQuery.dataUpdatedAt, pollAttemptQuery.errorUpdatedAt]);

  const start = useCallback(async () => {
    if (!roundId) {
      setFlowError(new Error('Brak aktywnej rundy'));
      setStep('failed');
      return;
    }
    if (!lastPhotoUri) {
      setFlowError(new Error('Brak zdjęcia'));
      setStep('failed');
      return;
    }
    const pos = effectivePosition();
    if (!pos) {
      setFlowError(new Error('Brak lokalizacji'));
      setStep('failed');
      return;
    }

    try {
      setFlowError(null);
      setStep('creating');
      const created = await createAttempt.mutateAsync({
        roundId,
        data: {
          lat: pos.lat,
          lng: pos.lng,
          accuracy_m: pos.accuracy,
          taken_at: new Date().toISOString(),
          mocked: demoMode,
        },
      });

      setStep('uploading');
      const uploaded = await upload(lastPhotoUri, created.upload_url);
      if (!uploaded) {
        throw new Error('Nie udało się wysłać zdjęcia');
      }

      setStep('submitting');
      await submitAttempt.mutateAsync(created.attempt_id);
      setStep('polling');
    } catch (e) {
      setFlowError(e instanceof Error ? e : new Error('Nieznany błąd'));
      setStep('failed');
    }
  }, [roundId, lastPhotoUri, effectivePosition, demoMode, createAttempt, upload, submitAttempt]);

  const reset = useCallback(() => {
    setStep('idle');
    setFlowError(null);
  }, []);

  return {
    start,
    step: currentStep,
    attempt: pollAttemptQuery.data,
    error: flowError,
    reset,
  };
}
