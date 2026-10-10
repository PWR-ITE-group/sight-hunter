import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Dimensions, RefreshControl, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Copy, Brain, Settings, MapPin, Trophy, Star, Play } from 'lucide-react-native';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorBanner, errorMessage } from '../../components/ui/ErrorBanner';
import { Colors } from '../../constants/colors';
import { useMe } from '../../api/hooks/useMe';
import { useReelFeed } from '../../api/hooks/useReels';

export default function ProfileTab() {
  const router = useRouter();
  const screenWidth = Dimensions.get('window').width;
  const colWidth = (screenWidth - 48 - 16) / 3;

  const me = useMe();
  const feed = useReelFeed();
  const [copied, setCopied] = useState(false);

  // Found places are the reward reels this player has unlocked; that needs the whole feed.
  useEffect(() => {
    if (feed.hasNextPage && !feed.isFetchingNextPage) {
      feed.fetchNextPage();
    }
  }, [feed]);
  const discoveries = (feed.data ?? []).filter((r) => r.kind === 'reward' && !r.locked);
  const discoveriesComplete = !feed.hasNextPage && !feed.isFetchingNextPage;

  const handleCopyCode = async () => {
    if (!me.data) return;
    await Clipboard.setStringAsync(me.data.ref_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const refresh = () => {
    me.refetch();
    feed.refetch();
  };

  if (me.isLoading) {
    return (
      <View className="flex-1 bg-white">
        <View className="pt-16 pb-8 px-6 items-center bg-surface border-b border-app-border">
          <Skeleton className="w-20 h-20 rounded-full mb-4" />
          <Skeleton className="w-48 h-8 mb-2" />
          <Skeleton className="w-32 h-4" />
        </View>
        <View className="p-6 flex-row justify-between gap-x-2">
          <Skeleton className="flex-1 h-24 rounded-2xl" />
          <Skeleton className="flex-1 h-24 rounded-2xl" />
          <Skeleton className="flex-1 h-24 rounded-2xl" />
        </View>
      </View>
    );
  }

  if (me.error || !me.data) {
    return (
      <View className="flex-1 bg-white p-6 pt-16">
        <ErrorBanner message={errorMessage(me.error)} onRetry={() => me.refetch()} />
      </View>
    );
  }

  const user = me.data;

  return (
    <ScrollView
      className="flex-1 bg-white"
      refreshControl={<RefreshControl refreshing={me.isRefetching} onRefresh={refresh} />}
    >
      <View className="pt-16 pb-8 px-6 items-center bg-surface border-b border-app-border shadow-sm">
        <Avatar uri={user.avatar_url} nickname={user.nickname ?? undefined} size="lg" />
        <Text className="text-2xl font-bold text-app-text mt-4">{user.nickname ?? 'Gracz'}</Text>
        <Text className="text-text-secondary mt-1">{user.email}</Text>
      </View>

      <View className="p-6">
        <View className="flex-row justify-between mb-8 gap-x-2">
          <Card className="flex-1 items-center p-4">
            <Trophy color={Colors.primary} size={24} />
            <Text className="text-lg font-bold text-app-text mt-2">{user.points}</Text>
            <Text className="text-text-secondary text-xs">Punkty</Text>
          </Card>
          <Card className="flex-1 items-center p-4">
            <Star color="#FBBF24" size={24} />
            <Text className="text-lg font-bold text-app-text mt-2">{user.xp}</Text>
            <Text className="text-text-secondary text-xs">XP</Text>
          </Card>
          <Card className="flex-1 items-center p-4">
            <MapPin color={Colors.success} size={24} />
            <Text className="text-lg font-bold text-app-text mt-2">{discoveriesComplete ? discoveries.length : '…'}</Text>
            <Text className="text-text-secondary text-xs">Znalezione</Text>
          </Card>
        </View>

        <Text className="text-lg font-bold text-app-text mb-4">Kod polecenia</Text>
        <Card className="p-4 mb-2 flex-row items-center justify-between">
          <Text className="text-app-text font-bold text-lg tracking-wider">{user.ref_code}</Text>
          <Button
            title={copied ? 'Skopiowano' : 'Kopiuj'}
            icon={<Copy color="#FFFFFF" size={16} />}
            onPress={handleCopyCode}
            size="sm"
          />
        </Card>
        <Text className="text-text-tertiary text-xs mb-8">
          Znajomy rejestruje się z Twoim kodem — Ty dostajesz punkty, gdy znajdzie pierwsze miejsce.
        </Text>

        <Text className="text-lg font-bold text-app-text mb-4">Moje odkrycia</Text>
        {discoveries.length === 0 ? (
          <Text className="text-text-secondary mb-8">Jeszcze nic nie znalazłeś. Ruszaj na mapę!</Text>
        ) : (
          <View className="flex-row flex-wrap gap-2 mb-8">
            {discoveries.map((reel) => (
              <Pressable
                key={reel.id}
                onPress={() => router.push(`/reel/${reel.id}`)}
                className="rounded-lg bg-primary-light items-center justify-center p-2"
                style={{ width: colWidth, height: colWidth }}
              >
                <Play color={Colors.primary} size={24} />
                <Text className="text-primary text-xs font-bold text-center mt-2" numberOfLines={3}>
                  {reel.title}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <View className="gap-y-3 mb-8">
          <Button
            title="Quiz dnia"
            icon={<Brain color="#FFFFFF" size={20} />}
            onPress={() => router.push('/daily')}
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
    </ScrollView>
  );
}
