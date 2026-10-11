import { useState, useEffect } from 'react';
import * as ExpoLocation from 'expo-location';
import { useLocationStore } from '../store/locationStore';

export function useLocation() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const permissionStatus = useLocationStore((s) => s.permissionStatus);
  const setPermission = useLocationStore((s) => s.setPermission);
  const setCurrentPosition = useLocationStore((s) => s.setCurrentPosition);
  const setWatchSubscription = useLocationStore((s) => s.setWatchSubscription);
  const effectivePosition = useLocationStore((s) => s.effectivePosition);

  const requestPermission = async () => {
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      setPermission(status === 'granted' ? 'granted' : 'denied');
      return status === 'granted';
    } catch (e) {
      console.error('Error requesting location permission', e);
      return false;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const startWatching = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const hasPermission = permissionStatus === 'granted' || (await requestPermission());
        if (!hasPermission) {
          if (isMounted) setError('Brak uprawnień do lokalizacji');
          return;
        }

        const sub = await ExpoLocation.watchPositionAsync(
          {
            accuracy: ExpoLocation.Accuracy.High,
            timeInterval: 2000,
            distanceInterval: 5,
          },
          (loc) => {
            setCurrentPosition({
              lat: loc.coords.latitude,
              lng: loc.coords.longitude,
              accuracy: loc.coords.accuracy || 0,
            });
          }
        );

        if (isMounted) {
          setWatchSubscription(sub);
        } else {
          sub.remove();
        }
      } catch {
        if (isMounted) setError('Błąd pobierania lokalizacji');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    startWatching();

    return () => {
      isMounted = false;
      // We don't remove subscription here to keep it alive across screens,
      // but in a real app you might want more granular control
    };
    // Store setters are stable; re-run only when the permission changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionStatus]);

  return {
    position: effectivePosition(),
    isLoading,
    error,
    requestPermission,
  };
}
