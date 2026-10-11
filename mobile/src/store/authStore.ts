import { create } from 'zustand';
import { components } from '../api/schema';
import { setTokens, getAccessToken, getRefreshToken, clearTokens } from '../utils/storage';

type User = components['schemas']['User'];

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isHydrated: boolean;

  setTokens: (access: string, refresh: string) => Promise<void>;
  setUser: (user: User) => void;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
  isHydrated: false,

  setTokens: async (access, refresh) => {
    await setTokens(access, refresh);
    set({ accessToken: access, refreshToken: refresh, isAuthenticated: true });
  },

  setUser: (user) => set({ user }),

  logout: async () => {
    await clearTokens();
    set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false });
    // Note: queryClient.clear() should be called from components/hooks when logging out
  },

  hydrate: async () => {
    try {
      const access = await getAccessToken();
      const refresh = await getRefreshToken();
      if (access && refresh) {
        set({ accessToken: access, refreshToken: refresh, isAuthenticated: true });
      }
    } catch (e) {
      console.error('Failed to hydrate auth state:', e);
    } finally {
      set({ isHydrated: true });
    }
  },
}));
