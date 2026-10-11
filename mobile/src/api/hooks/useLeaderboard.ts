import { useQuery } from '@tanstack/react-query';
import { getLeaderboard } from '../endpoints/leaderboard';
import { queryKeys } from './queryKeys';

export function useLeaderboard(scope: 'week' | 'all' = 'week') {
  return useQuery({
    queryKey: queryKeys.leaderboard(scope),
    queryFn: () => getLeaderboard(scope),
  });
}
