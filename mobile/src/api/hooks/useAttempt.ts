import { useMutation, useQuery } from '@tanstack/react-query';
import { submitAttempt, getAttempt } from '../endpoints/attempts';
import { queryKeys } from './queryKeys';
import { Config } from '../../constants/config';
import { generateIdempotencyKey } from '../../utils/idempotency';

export function useSubmitAttempt() {
  return useMutation({
    mutationFn: (attemptId: string) => submitAttempt(attemptId, generateIdempotencyKey()),
  });
}

export function usePollAttempt(attemptId: string | null) {
  return useQuery({
    queryKey: attemptId ? queryKeys.attempt(attemptId) : [],
    queryFn: () => getAttempt(attemptId!),
    enabled: !!attemptId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'accepted' || status === 'rejected') return false;
      return Config.ATTEMPT_POLL_INTERVAL_MS;
    },
  });
}
