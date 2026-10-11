import React from 'react';
import { View, Text, SectionList, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useCameraPermissions } from 'expo-camera';
import { Camera, MapPin, User, Volume2, Gamepad2, Info, LogOut, type LucideIcon } from 'lucide-react-native';
import Header from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { Colors } from '../constants/colors';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { useLocationStore } from '../store/locationStore';
import { useSettingsStore } from '../store/settingsStore';

type Row =
  | { id: string; label: string; icon: LucideIcon; type: 'info'; value: string }
  | { id: string; label: string; icon: LucideIcon; type: 'toggle'; value: boolean; onToggle: (on: boolean) => void };

function permissionLabel(status: 'granted' | 'denied' | 'undetermined' | undefined): string {
  if (status === 'granted') return 'Przyznano';
  if (status === 'denied') return 'Odmówiono';
  return 'Nie pytano';
}

export default function SettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const demoMode = useGameStore((s) => s.demoMode);
  const setDemoMode = useGameStore((s) => s.setDemoMode);
  const clearMockPosition = useLocationStore((s) => s.clearMockPosition);
  const locationPermission = useLocationStore((s) => s.permissionStatus);
  const ttsEnabled = useSettingsStore((s) => s.ttsEnabled);
  const setTts = useSettingsStore((s) => s.setTts);
  const [cameraPermission] = useCameraPermissions();

  const sections: { title: string; data: Row[] }[] = [
    {
      title: 'Konto',
      data: [
        { id: 'email', label: 'E-mail', value: user?.email ?? '—', icon: User, type: 'info' },
        { id: 'nickname', label: 'Pseudonim', value: user?.nickname ?? '—', icon: User, type: 'info' },
      ],
    },
    {
      title: 'Uprawnienia',
      data: [
        { id: 'camera', label: 'Aparat', value: permissionLabel(cameraPermission?.status), icon: Camera, type: 'info' },
        { id: 'location', label: 'Lokalizacja', value: permissionLabel(locationPermission), icon: MapPin, type: 'info' },
      ],
    },
    {
      title: 'Gra',
      data: [
        { id: 'tts', label: 'Czytaj zagadki na głos', icon: Volume2, type: 'toggle', value: ttsEnabled, onToggle: setTts },
        {
          id: 'demo',
          label: 'Tryb demo (pozycja z mapy)',
          icon: Gamepad2,
          type: 'toggle',
          value: demoMode,
          onToggle: (on) => {
            setDemoMode(on);
            if (!on) clearMockPosition();
          },
        },
      ],
    },
    {
      title: 'O aplikacji',
      data: [
        { id: 'version', label: 'Wersja', value: 'Łowcy Historii v1.0.0', icon: Info, type: 'info' },
        { id: 'event', label: 'Wydarzenie', value: 'BEST Hacks 2026', icon: Info, type: 'info' },
      ],
    },
  ];

  const handleLogout = async () => {
    await logout();
    queryClient.clear();
    router.replace('/(auth)/welcome');
  };

  const renderItem = ({ item }: { item: Row }) => {
    const Icon = item.icon;
    return (
      <View className="flex-row items-center px-4 py-4 bg-surface border-b border-app-border">
        <View className="bg-primary-light p-2 rounded-lg mr-3">
          <Icon color={Colors.primary} size={20} />
        </View>
        <Text className="flex-1 text-app-text font-medium text-base">{item.label}</Text>
        {item.type === 'info' ? (
          <Text className="text-text-secondary">{item.value}</Text>
        ) : (
          <Switch
            value={item.value}
            onValueChange={item.onToggle}
            trackColor={{ false: Colors.border, true: Colors.primaryLight }}
            thumbColor={item.value ? Colors.primary : Colors.textTertiary}
          />
        )}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-paper pt-12">
      <Header title="Ustawienia" showBack />
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={({ section: { title } }) => (
          <Text className="px-4 py-2 mt-4 text-text-secondary font-bold text-sm uppercase">{title}</Text>
        )}
        ListFooterComponent={
          <View className="p-6 mt-4">
            <Button
              title="Wyloguj się"
              icon={<LogOut color="#FFFFFF" size={20} />}
              onPress={handleLogout}
              style={{ backgroundColor: Colors.error, borderColor: Colors.error }}
            />
          </View>
        }
      />
    </View>
  );
}
