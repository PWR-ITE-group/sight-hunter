import { useMutation } from '@tanstack/react-query';
import { requestHint, createAttempt } from '../endpoints/rounds';
import { useGameStore } from '../../store/gameStore';
import { generateIdempotencyKey } from '../../utils/idempotency';
import { components } from '../schema';

export function useHint() {
  const incrementHints = useGameStore((s) => s.incrementHints);

  return useMutation({
    mutationFn: ({ roundId }: { roundId: string }) =>
      requestHint(roundId, generateIdempotencyKey()),
    onSuccess: () => {
      incrementHints();
    },
  });
}

export function useCreateAttempt() {
  const setActiveAttempt = useGameStore((s) => s.setActiveAttempt);

  return useMutation({
    mutationFn: ({ roundId, data }: { roundId: string; data: components['schemas']['AttemptRequest'] }) =>
      createAttempt(roundId, data),
    onSuccess: ({ attempt_id }) => {
      setActiveAttempt(attempt_id);
    },
  });
}
