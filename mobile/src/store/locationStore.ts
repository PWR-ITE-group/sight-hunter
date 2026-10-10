import { create } from 'zustand';
import { useGameStore } from './gameStore';
import * as Location from 'expo-location';

type Position = { lat: number; lng: number; accuracy: number };

interface LocationState {
  currentPosition: Position | null;
  mockPosition: { lat: number; lng: number } | null;
  permissionStatus: 'undetermined' | 'granted' | 'denied';
  watchSubscription: Location.LocationSubscription | null;

  effectivePosition: () => Position | null;
  setCurrentPosition: (pos: Position) => void;
  setMockPosition: (lat: number, lng: number) => void;
  clearMockPosition: () => void;
  setPermission: (status: 'undetermined' | 'granted' | 'denied') => void;
  setWatchSubscription: (sub: Location.LocationSubscription | null) => void;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  currentPosition: null,
  mockPosition: null,
  permissionStatus: 'undetermined',
  watchSubscription: null,

  effectivePosition: () => {
    const isDemo = useGameStore.getState().demoMode;
    const { mockPosition, currentPosition } = get();
    if (isDemo && mockPosition) {
      return { ...mockPosition, accuracy: 5 }; // Mock accuracy
    }
    return currentPosition;
  },

  setCurrentPosition: (pos) => set({ currentPosition: pos }),
  setMockPosition: (lat, lng) => set({ mockPosition: { lat, lng } }),
  clearMockPosition: () => set({ mockPosition: null }),
  setPermission: (status) => set({ permissionStatus: status }),
  setWatchSubscription: (sub) => {
    const currentSub = get().watchSubscription;
    if (currentSub) {
      currentSub.remove();
    }
    set({ watchSubscription: sub });
  },
}));
