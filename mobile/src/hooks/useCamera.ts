import { useState } from 'react';
import { useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { useGameStore } from '../store/gameStore';
import { Config } from '../constants/config';

export function useCamera() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const setLastPhoto = useGameStore((s) => s.setLastPhoto);

  const takePicture = async (cameraRef: any): Promise<string | null> => {
    if (!cameraRef?.current) return null;
    
    try {
      setIsProcessing(true);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      
      const manipulated = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: Config.PHOTO_MAX_WIDTH } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );
      
      setLastPhoto(manipulated.uri);
      return manipulated.uri;
    } catch (e) {
      console.error('Failed to take/process picture', e);
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    hasPermission: permission?.granted ?? false,
    requestPermission,
    takePicture,
    isProcessing,
  };
}
