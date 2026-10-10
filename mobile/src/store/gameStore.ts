import { create } from 'zustand';

interface GameState {
  activeRoundId: string | null;
  activeTaskId: string | null;
  activeAttemptId: string | null;
  hintsUsed: number;
  lastPhotoUri: string | null;
  demoMode: boolean;

  setActiveRound: (roundId: string, taskId: string) => void;
  setActiveAttempt: (attemptId: string) => void;
  setLastPhoto: (uri: string) => void;
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
  demoMode: false,

  setActiveRound: (roundId, taskId) => set({ activeRoundId: roundId, activeTaskId: taskId, hintsUsed: 0 }),
  setActiveAttempt: (attemptId) => set({ activeAttemptId: attemptId }),
  setLastPhoto: (uri) => set({ lastPhotoUri: uri }),
  clearRound: () => set({ activeRoundId: null, activeTaskId: null, activeAttemptId: null, hintsUsed: 0, lastPhotoUri: null }),
  setDemoMode: (on) => set({ demoMode: on }),
  incrementHints: () => set((state) => ({ hintsUsed: state.hintsUsed + 1 })),
}));
