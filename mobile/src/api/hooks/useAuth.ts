import { useMutation } from '@tanstack/react-query';
import { login, register, requestPasswordReset } from '../endpoints/auth';
import { useAuthStore } from '../../store/authStore';
import { components } from '../schema';

export function useLogin() {
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: (data: components['schemas']['LoginRequest']) => login(data),
    onSuccess: async ({ access, refresh, user }) => {
      await setTokens(access, refresh);
      setUser(user);
    },
  });
}

export function useRegister() {
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: (data: components['schemas']['RegisterRequest']) => register(data),
    onSuccess: async ({ access, refresh, user }) => {
      await setTokens(access, refresh);
      setUser(user);
    },
  });
}

export function usePasswordReset() {
  return useMutation({
    mutationFn: (email: string) => requestPasswordReset(email),
  });
}
