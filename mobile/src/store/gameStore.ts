import { create } from 'zustand';
import { Config } from '../constants/config';

interface GameState {
  activeRoundId: string | null;
  activeTaskId: string | null;
  activeAttemptId: string | null;
  hintsUsed: number;
  lastPhotoUri: string | null;
  /** Server-side DEMO_MODE must be on too; then a long tap on the map sets the position. */
  demoMode: boolean;

  setActiveRound: (roundId: string, taskId: string) => void;
  setActiveAttempt: (attemptId: string | null) => void;
  setLastPhoto: (uri: string | null) => void;
  clearRound: () => void;
  setDemoMode: (on: boolean) => void;
  incrementHints: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  activeRoundId: null,
  activeTaskId: null,
  activeAttemptId: null,
  hintsUsed: 0,
  lastPhotoUri: null,
  demoMode: Config.DEMO_MODE_DEFAULT,

  setActiveRound: (roundId, taskId) =>
    set({ activeRoundId: roundId, activeTaskId: taskId, hintsUsed: 0, activeAttemptId: null }),
  setActiveAttempt: (attemptId) => set({ activeAttemptId: attemptId }),
  setLastPhoto: (uri) => set({ lastPhotoUri: uri }),
  clearRound: () =>
    set({
      activeRoundId: null,
      activeTaskId: null,
      activeAttemptId: null,
      hintsUsed: 0,
      lastPhotoUri: null,
    }),
  setDemoMode: (on) => set({ demoMode: on }),
  incrementHints: () => set((state) => ({ hintsUsed: state.hintsUsed + 1 })),
}));
