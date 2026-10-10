import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useHintEndpoint, createAttempt } from '../endpoints/rounds';
import { useGameStore } from '../../store/gameStore';
import { generateIdempotencyKey } from '../../utils/idempotency';
import { components } from '../schema';
import { queryKeys } from './queryKeys';

export function useHint() {
  const queryClient = useQueryClient();
  const incrementHints = useGameStore((s) => s.incrementHints);

  return useMutation({
    mutationFn: ({ roundId }: { roundId: string }) =>
      useHintEndpoint(roundId, generateIdempotencyKey()),
    onSuccess: (_, { roundId }) => {
      incrementHints();
      // To get updated reward points, we might want to invalidate active round or task
      // Currently backend doesn't return full round/task on hint, so we might need a refetch
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
