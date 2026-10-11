import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  ttsEnabled: boolean;
  language: 'pl';
  /** Accounts that completed the tutorial on this device. */
  onboardedUserIds: string[];
  /** The player's picks in today's quiz, so the summary survives a reload. */
  dailyAnswers: { date: string; answers: Record<string, number> } | null;
  /** Persisted state has been read from AsyncStorage (the auth guard waits for this). */
  hydrated: boolean;
  setTts: (on: boolean) => void;
  completeOnboarding: (userId: string) => void;
  setDailyAnswers: (date: string, answers: Record<string, number>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ttsEnabled: true,
      language: 'pl',
      onboardedUserIds: [],
      dailyAnswers: null,
      hydrated: false,
      setTts: (on) => set({ ttsEnabled: on }),
      completeOnboarding: (userId) => set((s) => ({
        onboardedUserIds: s.onboardedUserIds.includes(userId)
          ? s.onboardedUserIds
          : [...s.onboardedUserIds, userId],
      })),
      setDailyAnswers: (date, answers) => set({ dailyAnswers: { date, answers } }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        ttsEnabled: s.ttsEnabled,
        language: s.language,
        onboardedUserIds: s.onboardedUserIds,
        dailyAnswers: s.dailyAnswers,
      }),
      onRehydrateStorage: () => () => {
        useSettingsStore.setState({ hydrated: true });
      },
    }
  )
);
