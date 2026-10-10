import React, { useState } from 'react';
import { View, Text, SectionList, Switch, TouchableOpacity } from 'react-native';
import { Button } from '../components/ui/Button';
import { Colors } from '../constants/colors';
import { ChevronRight, Camera, MapPin, User, Volume2, Gamepad2, Info, LogOut } from 'lucide-react-native';
import { useRouter } from 'expo-router';

const SECTIONS = [
  {
    title: 'Konto',
    data: [
      { id: 'email', label: 'E-mail', value: 'hunter@example.com', icon: User, type: 'info' },
      { id: 'nickname', label: 'Pseudonim', value: 'WroclawHunter', icon: User, type: 'link' },
    ]
  },
  {
    title: 'Uprawnienia',
    data: [
      { id: 'camera', label: 'Aparat', value: 'Przyznano', icon: Camera, type: 'link' },
      { id: 'location', label: 'Lokalizacja', value: 'Przyznano', icon: MapPin, type: 'link' },
    ]
  },
  {
    title: 'Gra',
    data: [
      { id: 'tts', label: 'Czytaj zagadki na głos (TTS)', icon: Volume2, type: 'toggle' },
      { id: 'demo', label: 'Tryb demo', icon: Gamepad2, type: 'toggle' },
    ]
  },
  {
    title: 'O aplikacji',
    data: [
      { id: 'version', label: 'Wersja', value: 'Łowcy Historii v1.0.0', icon: Info, type: 'info' },
      { id: 'event', label: 'Wydarzenie', value: 'BEST Hacks 2026', icon: Info, type: 'info' },
    ]
  }
];

export default function SettingsScreen() {
  const router = useRouter();
  const [toggles, setToggles] = useState<Record<string, boolean>>({ tts: true, demo: false });

  const toggleSwitch = (id: string) => {
    setToggles(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderItem = ({ item }: { item: any }) => {
    const Icon = item.icon;
    return (
      <View className="flex-row items-center px-4 py-4 bg-surface border-b border-border">
        <View className="bg-primaryLight p-2 rounded-lg mr-3">
          <Icon color={Colors.primary} size={20} />
        </View>
        <Text className="flex-1 text-app-text font-medium text-base">{item.label}</Text>
        
        {item.type === 'info' && (
          <Text className="text-textSecondary">{item.value}</Text>
        )}
        
        {item.type === 'link' && (
          <TouchableOpacity className="flex-row items-center">
            <Text className="text-textSecondary mr-1">{item.value}</Text>
            <ChevronRight color={Colors.textTertiary} size={20} />
          </TouchableOpacity>
        )}
        
        {item.type === 'toggle' && (
          <Switch 
            value={toggles[item.id]} 
            onValueChange={() => toggleSwitch(item.id)}
            trackColor={{ false: Colors.border, true: Colors.primaryLight }}
            thumbColor={toggles[item.id] ? Colors.primary : Colors.textTertiary}
          />
        )}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-background">
      <SectionList
        sections={SECTIONS}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        renderSectionHeader={({ section: { title } }) => (
          <Text className="px-4 py-2 mt-4 text-textSecondary font-bold text-sm uppercase">
            {title}
          </Text>
        )}
        ListFooterComponent={
          <View className="p-6 mt-4">
            <Button 
              title="Wyloguj się"
              icon={<LogOut color={Colors.background} size={20} />}
              onPress={() => router.replace('/(auth)/welcome')}
              style={{ backgroundColor: Colors.error }}
            />
          </View>
        }
      />
    </View>
  );
}
