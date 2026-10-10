import React, { useRef, useState } from 'react';
import { View, Text, FlatList, Dimensions, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';
import { useRouter } from 'expo-router';
import { Landmark, Gift, type LucideIcon } from 'lucide-react-native';
import { Button } from '../components/ui/Button';
import { Colors } from '../constants/colors';
import { useSettingsStore } from '../store/settingsStore';

const { width } = Dimensions.get('window');

const SLIDES: { id: string; title: string; description: string; icon: LucideIcon }[] = [
  {
    id: '1',
    title: 'Witaj w grze!',
    description: 'Szukaj historycznych miejsc we Wrocławiu, rób zdjęcia i odkrywaj ich historię.',
    icon: Landmark,
  },
  {
    id: '2',
    title: 'Twój pierwszy bonus!',
    description: 'Na start masz 50 punktów. Każde znalezione miejsce daje XP do rankingu, punkty i rolkę o jego historii.',
    icon: Gift,
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const setOnboarded = useSettingsStore((s) => s.setOnboarded);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const finish = () => {
    setOnboarded(true);
    router.replace('/(tabs)');
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      finish();
    }
  };

  const renderItem = ({ item }: { item: (typeof SLIDES)[0] }) => {
    const Icon = item.icon;
    return (
      <View style={{ width }} className="items-center justify-center px-8">
        <View className="bg-primary-light p-8 rounded-full mb-8">
          <Icon color={Colors.primary} size={80} />
        </View>
        <Text className="text-3xl font-bold text-app-text mb-4 text-center">{item.title}</Text>
        <Text className="text-lg text-text-secondary text-center leading-relaxed">{item.description}</Text>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-paper">
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
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
              className={`h-2 rounded-full ${index === currentIndex ? 'w-6 bg-primary' : 'w-2 bg-app-border'}`}
            />
          ))}
        </View>

        <View className="w-full gap-y-3">
          <Button
            title={currentIndex === SLIDES.length - 1 ? 'Zacznij grę' : 'Dalej'}
            onPress={handleNext}
            variant="primary"
          />
          {currentIndex < SLIDES.length - 1 && <Button title="Pomiń" onPress={finish} variant="ghost" />}
        </View>
      </View>
    </View>
  );
}
