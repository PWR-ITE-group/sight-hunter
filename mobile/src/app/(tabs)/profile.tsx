import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Dimensions, RefreshControl } from 'react-native';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Image } from 'expo-image';
import { Copy, ShoppingCart, Settings, MapPin, Trophy, Star } from 'lucide-react-native';
import { Skeleton } from '../../components/ui/Skeleton';
import { Colors } from '../../constants/colors';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';

const MOCK_USER = {
  nickname: 'WroclawHunter',
  email: 'hunter@example.com',
  points: 1250,
  xp: 4500,
  found_count: 24,
  ref_code: 'HUNT-2026-XQZ',
  avatar_url: 'https://i.pravatar.cc/150?img=33'
};

const MOCK_REELS = Array.from({ length: 6 }).map((_, i) => ({
  id: String(i),
  thumbnail_url: `https://images.unsplash.com/photo-${1500000000000 + i * 1000}?q=80&w=300&auto=format&fit=crop`
}));

export default function ProfileTab() {
  const router = useRouter();
  const screenWidth = Dimensions.get('window').width;
  const colWidth = (screenWidth - 48 - 16) / 3;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(MOCK_USER.ref_code);
  };

  return (
    <ScrollView 
      className="flex-1 bg-background"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {loading ? (
        <View className="flex-1">
          <View className="pt-16 pb-8 px-6 items-center bg-surface border-b border-border shadow-sm">
            <Skeleton className="w-20 h-20 rounded-full mb-4" />
            <Skeleton className="w-48 h-8 mb-2" />
            <Skeleton className="w-32 h-4" />
          </View>
          <View className="p-6">
            <View className="flex-row justify-between mb-8 gap-x-2">
              <Skeleton className="flex-1 h-24 rounded-2xl" />
              <Skeleton className="flex-1 h-24 rounded-2xl" />
              <Skeleton className="flex-1 h-24 rounded-2xl" />
            </View>
            <Skeleton className="w-48 h-6 mb-4" />
            <Skeleton className="w-full h-16 rounded-2xl mb-8" />
            <Skeleton className="w-48 h-6 mb-4" />
            <View className="flex-row flex-wrap gap-2 mb-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="rounded-lg" style={{ width: colWidth, height: colWidth }} />
              ))}
            </View>
          </View>
        </View>
      ) : (
        <>
          <View className="pt-16 pb-8 px-6 items-center bg-surface border-b border-border shadow-sm">
            <Avatar uri={MOCK_USER.avatar_url} nickname={MOCK_USER.nickname} size="lg" />
            <Text className="text-2xl font-bold text-app-text mt-4">{MOCK_USER.nickname}</Text>
            <Text className="text-textSecondary mt-1">{MOCK_USER.email}</Text>
          </View>

          <View className="p-6">
            <View className="flex-row justify-between mb-8 gap-x-2">
              <Card className="flex-1 items-center p-4">
                <Trophy color={Colors.primary} size={24} className="mb-2" />
                <Text className="text-lg font-bold text-app-text">{MOCK_USER.points}</Text>
                <Text className="text-textSecondary text-xs">Punkty</Text>
              </Card>
              
              <Card className="flex-1 items-center p-4">
                <Star color="#FBBF24" size={24} className="mb-2" />
                <Text className="text-lg font-bold text-app-text">{MOCK_USER.xp}</Text>
                <Text className="text-textSecondary text-xs">XP</Text>
              </Card>

              <Card className="flex-1 items-center p-4">
                <MapPin color={Colors.success} size={24} className="mb-2" />
                <Text className="text-lg font-bold text-app-text">{MOCK_USER.found_count}</Text>
                <Text className="text-textSecondary text-xs">Znalezione</Text>
              </Card>
            </View>

            <Text className="text-lg font-bold text-app-text mb-4">Kod polecenia</Text>
            <Card className="p-4 mb-8 flex-row items-center justify-between">
              <Text className="text-app-text font-bold text-lg tracking-wider">{MOCK_USER.ref_code}</Text>
              <Button 
                title="Kopiuj"
                icon={<Copy color={Colors.background} size={16} />}
                onPress={handleCopyCode}
                size="sm"
              />
            </Card>

            <Text className="text-lg font-bold text-app-text mb-4">Moje odkrycia</Text>
            <View className="flex-row flex-wrap gap-2 mb-8">
              {MOCK_REELS.map(reel => (
                <Image 
                  key={reel.id}
                  source={{ uri: reel.thumbnail_url }}
                  style={{ width: colWidth, height: colWidth }}
                  className="rounded-lg bg-border"
                  contentFit="cover"
                />
              ))}
            </View>

            <View className="gap-y-3 mb-8">
              <Button 
                title="Sklep"
                icon={<ShoppingCart color={Colors.background} size={20} />}
                onPress={() => router.push('/shop')}
                variant="primary"
              />
              <Button 
                title="Ustawienia"
                icon={<Settings color={Colors.primary} size={20} />}
                onPress={() => router.push('/settings')}
                variant="outline"
              />
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}
