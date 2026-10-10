import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  ttsEnabled: boolean;
  language: 'pl';
  /** Onboarding slides were shown on this device. */
  onboarded: boolean;
  /** Persisted state has been read from AsyncStorage (the auth guard waits for this). */
  hydrated: boolean;
  setTts: (on: boolean) => void;
  setOnboarded: (done: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ttsEnabled: true,
      language: 'pl',
      onboarded: false,
      hydrated: false,
      setTts: (on) => set({ ttsEnabled: on }),
      setOnboarded: (done) => set({ onboarded: done }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ ttsEnabled: s.ttsEnabled, language: s.language, onboarded: s.onboarded }),
      onRehydrateStorage: () => () => {
        useSettingsStore.setState({ hydrated: true });
      },
    }
  )
);
