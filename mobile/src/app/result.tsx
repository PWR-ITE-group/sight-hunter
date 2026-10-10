import React from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { RewardAnimation } from '../components/game/RewardAnimation';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { PlayCircle } from 'lucide-react-native';
import { Colors } from '../constants/colors';
import { Image } from 'expo-image';
import Animated from 'react-native-reanimated';

export default function ResultScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-primary-light p-6 justify-center">
      <Text className="text-4xl font-bold text-app-text text-center mb-2">Gratulacje!</Text>
      <Text className="text-lg text-text-secondary text-center mb-8">Znalazłeś kolejne miejsce</Text>
      
      <RewardAnimation points={150} xp={300} />

      <View className="my-8">
        <Card padding={16} elevation="md">
          <View className="flex-row items-center gap-4">
            <View className="w-16 h-16 rounded-xl overflow-hidden bg-slate-200">
              <Animated.Image 
                source={{ uri: 'https://picsum.photos/400/300' }} 
                style={{ width: '100%', height: '100%' }} 
                sharedTransitionTag="photo"
                // @ts-ignore
                contentFit="cover"
              />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold text-primary uppercase mb-1">Odblokowano!</Text>
              <Text className="text-base font-bold text-app-text">Tajemnica Ratusza</Text>
            </View>
          </View>
          <View className="mt-4">
            <Button 
              title="Obejrzyj historię" 
              variant="outline" 
              icon={<PlayCircle size={20} color={Colors.primary} />}
              onPress={() => router.push('/reel/mock-reel-id' as any)}
            />
          </View>
        </Card>
      </View>

      <View className="mt-auto">
        <Button 
          title="Szukaj dalej" 
          variant="primary" 
          size="lg"
          onPress={() => router.push('/next' as any)} 
        />
      </View>
    </View>
  );
}
