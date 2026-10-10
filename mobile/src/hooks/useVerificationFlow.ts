import { useState, useCallback, useEffect } from 'react';
import { useLocationStore } from '../store/locationStore';
import { useGameStore } from '../store/gameStore';
import { useCreateAttempt } from '../api/hooks/useRound';
import { useSubmitAttempt, usePollAttempt } from '../api/hooks/useAttempt';
import { usePhotoUpload } from './usePhotoUpload';
import { ApiClientError } from '../api/client';

export type VerificationStep = 'idle' | 'creating' | 'uploading' | 'submitting' | 'polling' | 'done';

export function useVerificationFlow(roundId: string | null) {
  const [step, setStep] = useState<VerificationStep>('idle');
  const [flowError, setFlowError] = useState<ApiClientError | Error | null>(null);
  
  const effectivePosition = useLocationStore((s) => s.effectivePosition);
  const { lastPhotoUri, demoMode, activeAttemptId } = useGameStore((s) => ({
    lastPhotoUri: s.lastPhotoUri,
    demoMode: s.demoMode,
    activeAttemptId: s.activeAttemptId
  }));

  const createAttempt = useCreateAttempt();
  const { upload } = usePhotoUpload();
  const submitAttempt = useSubmitAttempt();
  
  // We use the activeAttemptId from store once created
  const pollAttemptQuery = usePollAttempt(activeAttemptId);

  // Monitor polling status
  useEffect(() => {
    if (step === 'polling' && pollAttemptQuery.data) {
      const status = pollAttemptQuery.data.status;
      if (status === 'accepted' || status === 'rejected') {
        setStep('done');
      }
    }
  }, [step, pollAttemptQuery.data]);

  const start = useCallback(async () => {
    if (!roundId) return;
    if (!lastPhotoUri) {
      setFlowError(new Error('No photo taken'));
      return;
    }
    
    const pos = effectivePosition();
    if (!pos) {
      setFlowError(new Error('No location available'));
      return;
    }

    try {
      setStep('creating');
      setFlowError(null);
      
      const createRes = await createAttempt.mutateAsync({
        roundId,
        data: {
          lat: pos.lat,
          lng: pos.lng,
          accuracy_m: pos.accuracy,
          taken_at: new Date().toISOString(),
          mocked: demoMode,
        }
      });
      
      setStep('uploading');
      const uploadSuccess = await upload(lastPhotoUri, createRes.upload_url);
      
      if (!uploadSuccess) {
        throw new Error('Upload failed');
      }
      
      setStep('submitting');
      await submitAttempt.mutateAsync(createRes.attempt_id);
      
      setStep('polling');
      
    } catch (e) {
      console.error('Verification flow error', e);
      setFlowError(e instanceof Error ? e : new Error('Unknown error'));
      setStep('idle');
    }
  }, [roundId, lastPhotoUri, effectivePosition, demoMode, createAttempt, upload, submitAttempt]);

  const reset = useCallback(() => {
    setStep('idle');
    setFlowError(null);
  }, []);

  return {
    start,
    step,
    attempt: pollAttemptQuery.data,
    error: flowError,
    reset,
  };
}
