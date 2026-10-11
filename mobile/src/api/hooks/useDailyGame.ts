import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDailyGame, startDailyGame, submitDailyAnswers } from '../endpoints/dailyGame';
import { queryKeys } from './queryKeys';

export function useDailyGame() {
  return useQuery({
    queryKey: queryKeys.dailyGame,
    queryFn: getDailyGame,
  });
}

export function useStartDailyGame() {
  return useMutation({ mutationFn: startDailyGame });
}

export function useSubmitDailyAnswers() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: submitDailyAnswers,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dailyGame });
      queryClient.invalidateQueries({ queryKey: queryKeys.me });
    },
  });
}
