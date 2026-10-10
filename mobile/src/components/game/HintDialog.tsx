import React from 'react';
import { View, Text } from 'react-native';
import BottomSheet from '../ui/BottomSheet';
import Button from '../ui/Button';
import { Feather } from '@expo/vector-icons';

type Props = {
  visible: boolean;
  hintText: string;
  hintsUsed: number;
  newRewardPoints: number;
  onClose: () => void;
};

export default function HintDialog({
  visible,
  hintText,
  hintsUsed,
  newRewardPoints,
  onClose,
}: Props) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title={`Wskazówka ${hintsUsed}/3`}>
      <View className="items-center mb-6 mt-4">
        <View className="w-16 h-16 bg-warning/20 rounded-full items-center justify-center mb-4">
          <Feather name="loader" size={32} color="#F59E0B" /> 
        </View>
        <Text className="text-base text-app-text text-center mb-6 px-4">
          {hintText}
        </Text>
        <View className="bg-error/20 px-4 py-2 rounded-lg">
          <Text className="text-error font-medium text-sm text-center">
            Nagroda zmniejszona do {newRewardPoints} pkt
          </Text>
        </View>
      </View>
      <View className="px-4 pb-8">
        <Button title="Rozumiem" onPress={onClose} variant="primary" />
      </View>
    </BottomSheet>
  );
}
