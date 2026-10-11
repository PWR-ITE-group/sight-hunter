import React, { useState } from 'react';
import {
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Camera, CircleHelp, Landmark, MapPin, Play, Trophy } from 'lucide-react-native';

const INK = '#16233f';
const BLUE = '#2c52c4';
const GOLD = '#e2aa45';
const PURPLE = '#b597ff';

const SLIDES = [
  {
    id: 'circle',
    title: 'Znajdź krąg na mapie',
    description: 'Na mapie pojawia się krąg. Zabytek jest gdzieś w środku.',
  },
  {
    id: 'task',
    title: 'Rozwiąż zagadkę',
    description: 'Dostajesz zadanie w jednym prostym zdaniu.',
  },
  {
    id: 'camera',
    title: 'Zrób zdjęcie na miejscu',
    description: 'Idziesz na miejsce i robisz zdjęcie budynku.',
  },
  {
    id: 'reward',
    title: 'Odkryj historię',
    description: 'Za znalezisko dostajesz XP do rankingu, punkty i rolkę o historii miejsca.',
  },
] as const;

function StepIllustration({ step }: { step: (typeof SLIDES)[number]['id'] }) {
  if (step === 'circle') {
    return (
      <View className="justify-center items-center rounded-3xl overflow-hidden" style={{ width: 236, height: 276, backgroundColor: '#e4e8de' }}>
        <View style={{ position: 'absolute', width: 280, height: 48, backgroundColor: '#b4c9e4', transform: [{ rotate: '-18deg' }] }} />
        <View style={{ position: 'absolute', width: 240, height: 34, backgroundColor: '#b4c9e4', transform: [{ rotate: '28deg' }] }} />
        <View
          className="items-center justify-center rounded-full"
          style={{
            position: 'absolute',
            width: 124,
            height: 124,
            borderWidth: 3,
            borderStyle: 'dashed',
            borderColor: BLUE,
            backgroundColor: 'rgba(44,82,196,0.16)',
          }}
        >
          <CircleHelp color="#b5422e" size={42} />
        </View>
        <View style={{ position: 'absolute', bottom: 48, left: 56, backgroundColor: BLUE, borderRadius: 20, padding: 6, borderWidth: 3, borderColor: '#fff' }}>
          <MapPin color="#fff" size={22} fill={BLUE} />
        </View>
      </View>
    );
  }

  if (step === 'task') {
    return (
      <View className="justify-center items-center" style={{ width: 236, height: 276 }}>
        <View className="rounded-3xl p-6 shadow-lg" style={{ width: 220, backgroundColor: '#fff' }}>
          <Text className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: BLUE }}>Twoje zadanie</Text>
          <Text className="text-2xl font-bold leading-8" style={{ color: INK, fontFamily: 'Georgia' }}>
            Znajdź kościół z dwiema wieżami
          </Text>
        </View>
        <View style={{ width: 0, height: 0, borderLeftWidth: 17, borderRightWidth: 0, borderTopWidth: 18, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#fff', alignSelf: 'flex-start', marginLeft: 36 }} />
      </View>
    );
  }

  if (step === 'camera') {
    return (
      <View className="items-center justify-center rounded-3xl" style={{ width: 164, height: 264, backgroundColor: '#0b0d0c', borderColor: '#fff', borderWidth: 3 }}>
        <View className="flex-1 items-center justify-center">
          <Landmark color="#d7b895" size={92} strokeWidth={1.4} />
          <Text className="text-white/70 text-xs mt-4">Skieruj aparat na budynek</Text>
        </View>
        <View className="items-center justify-center rounded-full mb-4" style={{ width: 42, height: 42, backgroundColor: '#fff' }}>
          <Camera color={INK} size={22} />
        </View>
      </View>
    );
  }

  return (
    <View className="items-center justify-center">
      <View className="items-center justify-center rounded-3xl" style={{ width: 164, height: 214, backgroundColor: '#0b0d0c', borderColor: '#fff', borderWidth: 3 }}>
        <View className="items-center justify-center rounded-full" style={{ width: 64, height: 64, backgroundColor: 'rgba(255,255,255,0.2)' }}>
          <Play color="#fff" size={32} fill="#fff" />
        </View>
        <View className="absolute -bottom-5 -right-5 rounded-full p-3" style={{ backgroundColor: '#2c8350' }}>
          <Trophy color="#fff" size={24} />
        </View>
      </View>
      <View className="flex-row items-center mt-8">
        <Text className="font-bold text-xl mr-4" style={{ color: PURPLE }}>+100 XP</Text>
        <Text className="font-bold text-xl" style={{ color: GOLD }}>+40 pkt</Text>
      </View>
    </View>
  );
}

export function HowItWorksCard({ height }: { height: number }) {
  const { width } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const illustrationHeight = Math.min(300, Math.max(220, height * 0.38));

  const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width > 0) {
      const index = Math.round(event.nativeEvent.contentOffset.x / width);
      setCurrentIndex(Math.max(0, Math.min(SLIDES.length - 1, index)));
    }
  };

  return (
    <View style={{ width, height, backgroundColor: INK }} className="justify-between px-6 py-8">
      <View className="pt-3">
        <Text className="text-xs font-bold tracking-[3px] mb-2" style={{ color: '#a9bce9' }}>INSTRUKCJA • 4 KROKI</Text>
        <Text className="text-white text-3xl font-bold">Jak grać w Łowców Historii</Text>
      </View>

      <View style={{ height: illustrationHeight + 20, marginHorizontal: -24 }}>
        <ScrollView
          horizontal
          pagingEnabled
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumScrollEnd}
          style={{ flex: 1 }}
        >
          {SLIDES.map((slide) => (
            <View key={slide.id} style={{ width, height: illustrationHeight + 20 }} className="items-center justify-center">
              <StepIllustration step={slide.id} />
            </View>
          ))}
        </ScrollView>
      </View>

      <View className="pb-3">
        <Text className="text-white text-2xl font-bold mb-2">{SLIDES[currentIndex].title}</Text>
        <Text className="text-white/80 text-base leading-6">{SLIDES[currentIndex].description}</Text>
        <View className="flex-row items-center justify-between mt-6">
          <View className="flex-row items-center gap-x-2">
            {SLIDES.map((slide, index) => (
              <View
                key={slide.id}
                style={{ width: index === currentIndex ? 24 : 8, height: 8, borderRadius: 4, backgroundColor: index === currentIndex ? '#fff' : 'rgba(255,255,255,0.35)' }}
              />
            ))}
          </View>
          <Text className="text-white/60 text-xs">Przesuń, aby zobaczyć dalej →</Text>
        </View>
      </View>
    </View>
  );
}
