import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMe, setNickname } from '../endpoints/me';
import { useAuthStore } from '../../store/authStore';
import { queryKeys } from './queryKeys';

export function useMe() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: getMe,
    enabled: isAuthenticated,
  });
}

export function useSetNickname() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: (nickname: string) => setNickname(nickname),
    onSuccess: (user) => {
      setUser(user);
      queryClient.invalidateQueries({ queryKey: queryKeys.me });
    },
  });
}
