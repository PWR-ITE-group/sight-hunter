import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useLocation } from '../hooks/useLocation';
import '../../global.css';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000, // 30 seconds
    },
  },
});

export default function RootLayout() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const hydrate = useAuthStore((s) => s.hydrate);
  
  const router = useRouter();
  const segments = useSegments();

  // Initialize location tracking globally
  useLocation();

  // 1. Hydrate tokens from SecureStore on app start
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // 2. Hide splash screen after hydration is complete
  useEffect(() => {
    if (isHydrated) {
      SplashScreen.hideAsync();
    }
  }, [isHydrated]);

  // 3. Auth guard: redirect based on auth state
  useEffect(() => {
    if (!isHydrated) return;

    // Check if we are inside the (auth) group
    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Not logged in and not in auth group -> redirect to welcome
      router.replace('/(auth)/welcome' as any);
    } else if (isAuthenticated && !user?.nickname && String(segments[1]) !== 'nickname') {
      // Logged in but no nickname set -> force nickname screen
      router.replace('/(auth)/nickname' as any);
    } else if (isAuthenticated && user?.nickname && inAuthGroup) {
      // Logged in, has nickname, but in auth group -> redirect to main tabs
      router.replace('/(tabs)' as any);
    }
  }, [isAuthenticated, isHydrated, segments, user, router]);

  if (!isHydrated) {
    return null; // Render nothing while waiting for hydration (splash screen covers this)
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="task/[taskId]" options={{ presentation: 'card' }} />
        <Stack.Screen name="camera" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="verify/[attemptId]" options={{ presentation: 'card' }} />
        <Stack.Screen name="result" options={{ presentation: 'card' }} />
        <Stack.Screen name="next" options={{ presentation: 'card' }} />
        <Stack.Screen name="shop" options={{ presentation: 'card' }} />
        <Stack.Screen name="settings" options={{ presentation: 'card' }} />
        <Stack.Screen name="reel/[reelId]" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="onboarding" options={{ presentation: 'fullScreenModal' }} />
      </Stack>
    </QueryClientProvider>
  );
}
