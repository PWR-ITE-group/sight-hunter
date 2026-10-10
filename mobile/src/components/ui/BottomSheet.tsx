import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { X } from 'lucide-react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  runOnJS,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  snapPoints?: number[];
  children: React.ReactNode;
  title?: string;
}

export function BottomSheet({
  visible,
  onClose,
  snapPoints,
  children,
  title,
}: BottomSheetProps) {
  const [isRendered, setIsRendered] = useState(visible);
  
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible && !isRendered) {
      setIsRendered(true);
    }
  }, [visible, isRendered]);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 50, stiffness: 400 });
      opacity.value = withTiming(1, { duration: 250 });
    } else if (isRendered) {
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 });
      opacity.value = withTiming(0, { duration: 250 }, (finished) => {
        if (finished) {
          runOnJS(setIsRendered)(false);
        }
      });
    }
  }, [visible, isRendered, translateY, opacity]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        // @ts-ignore
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (event.translationY > 100 || event.velocityY > 1000) {
        runOnJS(onClose)();
      } else {
        // @ts-ignore
        translateY.value = withSpring(0, { damping: 50, stiffness: 400 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  const animatedBackdropStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  if (!isRendered) return null;

  return (
    <Modal
      visible={isRendered}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View 
          className="flex-1 bg-black/50 justify-end" 
          style={animatedBackdropStyle}
        >
          <TouchableOpacity 
            className="absolute inset-0" 
            activeOpacity={1} 
            onPress={onClose} 
          />
          
          <GestureDetector gesture={panGesture}>
            <Animated.View 
              className="bg-surface w-full rounded-t-3xl pt-2 px-6 pb-8 max-h-[90%]"
              style={[animatedStyle]}
            >
              <View className="items-center mb-4">
                <View className="w-12 h-1.5 bg-slate-300 rounded-full" />
              </View>
              
              {title && (
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-xl font-bold text-app-text">{title}</Text>
                  <TouchableOpacity onPress={onClose} className="p-2 -mr-2">
                    <X size={24} color={Colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              )}
              
              <View>
                {children}
              </View>
            </Animated.View>
          </GestureDetector>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

export default BottomSheet;
