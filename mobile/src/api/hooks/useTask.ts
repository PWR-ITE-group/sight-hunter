import { useQuery, useMutation } from '@tanstack/react-query';
import { getTask, startRound } from '../endpoints/tasks';
import { queryKeys } from './queryKeys';
import { useGameStore } from '../../store/gameStore';

export function useTask(taskId: string | null) {
  return useQuery({
    queryKey: taskId ? queryKeys.task(taskId) : [],
    queryFn: () => getTask(taskId!),
    enabled: !!taskId,
  });
}

export function useStartRound() {
  const setActiveRound = useGameStore((s) => s.setActiveRound);
  
  return useMutation({
    mutationFn: (taskId: string) => startRound(taskId),
    onSuccess: (round) => {
      setActiveRound(round.id, round.task_id);
    },
  });
}
