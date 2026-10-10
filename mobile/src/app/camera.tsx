import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { SwitchCamera, Zap, ZapOff, Check, RotateCcw } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated from 'react-native-reanimated';
import { IconButton } from '../components/ui/IconButton';
import { Button } from '../components/ui/Button';
import { Colors } from '../constants/colors';

const { width } = Dimensions.get('window');
const viewfinderWidth = width * 0.8;
const viewfinderHeight = viewfinderWidth * (4 / 3);

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();

  if (!permission) {
    return <View className="flex-1 bg-black" />;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-black items-center justify-center p-6">
        <Text className="text-white text-center mb-6">Potrzebujemy dostępu do kamery, abyś mógł robić zdjęcia.</Text>
        <Button title="Udziel dostępu" onPress={requestPermission} />
      </View>
    );
  }

  const toggleFacing = () => setFacing(prev => prev === 'back' ? 'front' : 'back');
  const toggleFlash = () => setFlash(prev => prev === 'off' ? 'on' : 'off');

  const takePicture = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo) {
        setPhotoUri(photo.uri);
      }
    }
  };

  const handleSend = () => {
    // В реальному додатку тут би створювався attempt
    // Mock: переходимо на екран верифікації
    router.push('/verify/mock-attempt-123' as any);
  };

  if (photoUri) {
    return (
      <View className="flex-1 bg-black">
        <Animated.Image 
          source={{ uri: photoUri }} 
          style={{ flex: 1 }} 
          sharedTransitionTag="photo"
          // @ts-ignore (expo-image props issue with Animated)
          contentFit="cover" 
        />
        <View className="absolute bottom-10 left-0 right-0 flex-row justify-center gap-4 px-6">
          <View className="flex-1">
            <Button title="Powtórz" variant="outline" onPress={() => setPhotoUri(null)} icon={<RotateCcw size={20} color={Colors.primary} />} />
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
      <CameraView 
        ref={cameraRef}
        style={{ flex: 1 }} 
        facing={facing}
        flash={flash}
      >
        <View style={styles.overlay}>
          <View style={styles.topOverlay} />
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
              <TouchableOpacity onPress={takePicture} activeOpacity={0.7}>
                <View className="w-20 h-20 rounded-full bg-white/30 items-center justify-center">
                  <View className="w-[68px] h-[68px] rounded-full bg-white" />
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
