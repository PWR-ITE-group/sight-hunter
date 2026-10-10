import React, { useState, useRef } from 'react';
import { View, Text, FlatList, Dimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { Button } from '../components/ui/Button';
import { Colors } from '../constants/colors';
import { Landmark, Gift } from 'lucide-react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'Witaj w grze!',
    description: 'Szukaj historycznych miejsc we Wrocławiu, rób zdjęcia i odkrywaj ich historię',
    icon: Landmark
  },
  {
    id: '2',
    title: 'Twój pierwszy bonus!',
    description: 'Otrzymujesz 50 punktów i 1 darmową wskazówkę na start',
    icon: Gift
  }
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    setCurrentIndex(Math.round(x / width));
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      router.replace('/(tabs)' as any);
    }
  };

  const renderItem = ({ item }: { item: typeof SLIDES[0] }) => {
    const Icon = item.icon;
    return (
      <View style={{ width }} className="items-center justify-center px-8">
        <View className="bg-primaryLight p-8 rounded-full mb-8">
          <Icon color={Colors.primary} size={80} />
        </View>
        <Text className="text-3xl font-bold text-app-text mb-4 text-center">{item.title}</Text>
        <Text className="text-lg text-textSecondary text-center leading-relaxed">{item.description}</Text>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-background">
      <FlatList 
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      />
      
      <View className="px-8 pb-12 pt-4 items-center">
        <View className="flex-row mb-8 gap-x-2">
          {SLIDES.map((_, index) => (
            <View 
              key={index} 
              className={`h-2 rounded-full transition-all duration-300 ${index === currentIndex ? 'w-6 bg-primary' : 'w-2 bg-border'}`}
            />
          ))}
        </View>
        
        <View className="w-full">
          <Button 
            title={currentIndex === SLIDES.length - 1 ? "Zacznij grę" : "Dalej"}
            onPress={handleNext}
            variant="primary"
          />
        </View>
      </View>
    </View>
  );
}
