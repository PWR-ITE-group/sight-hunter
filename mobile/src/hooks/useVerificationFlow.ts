import { useCallback, useState } from 'react';
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
