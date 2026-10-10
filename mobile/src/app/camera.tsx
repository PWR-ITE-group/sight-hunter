import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { CameraView } from 'expo-camera';
import { Image } from 'expo-image';
import { SwitchCamera, Zap, ZapOff, Check, RotateCcw, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { IconButton } from '../components/ui/IconButton';
import { Button } from '../components/ui/Button';
import { Colors } from '../constants/colors';
import { useCamera } from '../hooks/useCamera';
import { useGameStore } from '../store/gameStore';

const { width } = Dimensions.get('window');
const viewfinderWidth = width * 0.8;
const viewfinderHeight = viewfinderWidth * (4 / 3);

export default function CameraScreen() {
  const router = useRouter();
  const { hasPermission, requestPermission, takePicture, isProcessing } = useCamera();
  const activeRoundId = useGameStore((s) => s.activeRoundId);
  const setLastPhoto = useGameStore((s) => s.setLastPhoto);

  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  if (!activeRoundId) {
    return (
      <View className="flex-1 bg-black items-center justify-center p-6">
        <Text className="text-white text-center mb-6">Najpierw wybierz zadanie na mapie.</Text>
        <Button title="Wróć" onPress={() => router.back()} variant="outline" />
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View className="flex-1 bg-black items-center justify-center p-6">
        <Text className="text-white text-center mb-6">
          Potrzebujemy dostępu do aparatu, aby zrobić zdjęcie miejsca.
        </Text>
        <Button title="Udziel dostępu" onPress={() => requestPermission()} />
        <View className="mt-4">
          <Button title="Wróć" onPress={() => router.back()} variant="ghost" />
        </View>
      </View>
    );
  }

  const toggleFacing = () => setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
  const toggleFlash = () => setFlash((prev) => (prev === 'off' ? 'on' : 'off'));

  // Photos come only from the in-app camera (anti-cheat), resized to ~1280 px by useCamera.
  const handleCapture = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const uri = await takePicture(cameraRef);
    if (uri) setPhotoUri(uri);
  };

  const handleRetake = () => {
    setLastPhoto(null);
    setPhotoUri(null);
  };

  const handleSend = () => {
    router.replace('/verify/new');
  };

  if (photoUri) {
    return (
      <View className="flex-1 bg-black">
        <Image source={{ uri: photoUri }} style={{ flex: 1 }} contentFit="cover" />
        <View className="absolute bottom-10 left-0 right-0 flex-row justify-center gap-4 px-6">
          <View className="flex-1">
            <Button
              title="Powtórz"
              variant="outline"
              onPress={handleRetake}
              icon={<RotateCcw size={20} color={Colors.primary} />}
            />
          </View>
          <View className="flex-1">
            <Button title="Wyślij" variant="primary" onPress={handleSend} icon={<Check size={20} color="#fff" />} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing={facing} flash={flash}>
        <View style={styles.overlay}>
          <View style={styles.topOverlay}>
            <View className="pt-12 px-4 items-start">
              <IconButton icon={<X size={24} color="#fff" />} onPress={() => router.back()} size={44} color="rgba(255,255,255,0.2)" />
            </View>
          </View>
          <View style={styles.middleOverlay}>
            <View style={styles.sideOverlay} />
            <View style={[styles.viewfinder, { width: viewfinderWidth, height: viewfinderHeight }]} />
            <View style={styles.sideOverlay} />
          </View>
          <View style={styles.bottomOverlay}>
            <View className="flex-row items-center justify-between px-10 pb-12 w-full">
              <IconButton
                icon={<SwitchCamera size={28} color="#fff" />}
                onPress={toggleFacing}
                size={56}
                color="rgba(255,255,255,0.2)"
              />
              <TouchableOpacity onPress={handleCapture} activeOpacity={0.7} disabled={isProcessing}>
                <View className="w-20 h-20 rounded-full bg-white/30 items-center justify-center">
                  <View className={`w-[68px] h-[68px] rounded-full ${isProcessing ? 'bg-white/60' : 'bg-white'}`} />
                </View>
              </TouchableOpacity>
              <IconButton
                icon={flash === 'on' ? <Zap size={28} color="#fff" /> : <ZapOff size={28} color="#fff" />}
                onPress={toggleFlash}
                size={56}
                color="rgba(255,255,255,0.2)"
              />
            </View>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
  },
  topOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  middleOverlay: {
    flexDirection: 'row',
  },
  sideOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  viewfinder: {
    borderColor: 'white',
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
});
