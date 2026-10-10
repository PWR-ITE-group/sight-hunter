import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Button } from '../components/ui/Button';
import { errorMessage } from '../components/ui/ErrorBanner';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useLocation } from '../hooks/useLocation';
import { getMe } from '../api/endpoints/me';
import { ApiClientError } from '../api/client';
import '../../global.css';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export default function RootLayout() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const hydrate = useAuthStore((s) => s.hydrate);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const onboarded = useSettingsStore((s) => s.onboarded);
  const settingsHydrated = useSettingsStore((s) => s.hydrated);

  const router = useRouter();
  const segments = useSegments() as string[];

  // Initialize location tracking globally
  useLocation();

  // 1. Hydrate tokens from SecureStore on app start
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // 2. Tokens restored but no profile yet: fetch /me (the client refreshes the access token if needed).
  // A 401 means the session is gone; any other failure (no network, 5xx) gets a retry screen.
  const [profileError, setProfileError] = useState<unknown>(null);
  const [profileAttempt, setProfileAttempt] = useState(0);
  useEffect(() => {
    if (!isHydrated || !isAuthenticated || user) return;
    let cancelled = false;
    getMe()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof ApiClientError && e.status === 401) {
          logout();
        } else {
          setProfileError(e);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isHydrated, isAuthenticated, user, setUser, logout, profileAttempt]);

  const retryProfile = useCallback(() => {
    setProfileError(null);
    setProfileAttempt((n) => n + 1);
  }, []);
  const profileFailed = isAuthenticated && !user && profileError !== null;
  const ready = isHydrated && settingsHydrated && (!isAuthenticated || !!user || profileFailed);

  // 3. Hide splash screen once we know where to go
  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  // 4. Auth guard: redirect based on auth state
  useEffect(() => {
    if (!ready || profileFailed) return;
    const inAuthGroup = segments[0] === '(auth)';
    const onNickname = segments[1] === 'nickname';
    const onOnboarding = segments[0] === 'onboarding';

    if (!isAuthenticated) {
      if (!inAuthGroup) router.replace('/(auth)/welcome');
    } else if (!user?.nickname) {
      if (!onNickname) router.replace('/(auth)/nickname');
    } else if (!onboarded) {
      if (!onOnboarding) router.replace('/onboarding');
    } else if (inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [ready, profileFailed, isAuthenticated, user, onboarded, segments, router]);

  if (!ready) {
    return null; // Splash screen covers this
  }

  if (profileFailed) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-8">
        <Text className="text-2xl font-bold text-app-text mb-2 text-center">Brak połączenia z serwerem</Text>
        <Text className="text-text-secondary text-center mb-8">{errorMessage(profileError)}</Text>
        <View className="w-full gap-y-3">
          <Button title="Spróbuj ponownie" onPress={retryProfile} variant="primary" />
          <Button title="Wyloguj się" onPress={() => logout()} variant="ghost" />
        </View>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="task/[taskId]" options={{ presentation: 'card' }} />
          <Stack.Screen name="camera" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="verify/[attemptId]" options={{ presentation: 'card', gestureEnabled: false }} />
          <Stack.Screen name="result" options={{ presentation: 'card', gestureEnabled: false }} />
          <Stack.Screen name="next" options={{ presentation: 'card' }} />
          <Stack.Screen name="daily" options={{ presentation: 'card' }} />
          <Stack.Screen name="settings" options={{ presentation: 'card' }} />
          <Stack.Screen name="reel/[reelId]" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="onboarding" options={{ presentation: 'fullScreenModal' }} />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
