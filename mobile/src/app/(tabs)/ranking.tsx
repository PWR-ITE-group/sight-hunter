import React, { useState } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { Crown } from 'lucide-react-native';
import { Avatar } from '../../components/ui/Avatar';
import { Chip } from '../../components/ui/Chip';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorBanner, errorMessage } from '../../components/ui/ErrorBanner';
import { useLeaderboard } from '../../api/hooks/useLeaderboard';
import { components } from '../../api/schema';

type Entry = components['schemas']['LeaderboardEntry'];

export default function RankingTab() {
  const [scope, setScope] = useState<'week' | 'all'>('week');
  const board = useLeaderboard(scope);

  const items = board.data?.items ?? [];
  const me = board.data?.me;
  const top3 = items.slice(0, 3);
  const rest = items.slice(3);
  const isMe = (e: Entry) => !!me && e.rank === me.rank && e.nickname === me.nickname;

  const renderPodiumItem = (entry: Entry | undefined, position: number) => {
    if (!entry) return <View className="mx-2 w-24" />;
    const isFirst = position === 1;
    const color = isFirst ? '#FBBF24' : position === 2 ? '#9CA3AF' : '#B45309';
    return (
      <View className="items-center mx-2 w-24" style={{ marginTop: isFirst ? 0 : 20 }}>
        <View className="mb-2 relative">
          <Avatar nickname={entry.nickname} size={isFirst ? 'lg' : 'md'} />
          {isFirst && (
            <View className="absolute -top-4 -right-2 rotate-12">
              <Crown color={color} size={28} fill={color} />
            </View>
          )}
        </View>
        <Text className="font-bold text-app-text text-sm mb-1" numberOfLines={1}>
          {entry.nickname}
        </Text>
        <Text className="text-primary font-bold">{entry.xp} XP</Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: Entry }) => {
    const mine = isMe(item);
    return (
      <View className={`flex-row items-center px-6 py-4 border-b border-app-border ${mine ? 'bg-primary-light' : 'bg-surface'}`}>
        <Text className="text-text-secondary font-bold w-8 text-center">{item.rank}</Text>
        <View className="ml-2 mr-4">
          <Avatar nickname={item.nickname} size="sm" />
        </View>
        <Text className={`flex-1 font-bold ${mine ? 'text-primary-dark' : 'text-app-text'}`}>
          {item.nickname} {mine ? '(Ty)' : ''}
        </Text>
        <Text className="font-bold text-text-secondary">{item.xp} XP</Text>
      </View>
    );
  };

  const meOutsideTop = me && (me.rank === null || me.rank > items.length);

  return (
    <View className="flex-1 bg-white">
      <View className="pt-16 pb-4 px-6 items-center bg-surface shadow-sm z-10">
        <Text className="text-2xl font-bold text-app-text mb-4">Ranking</Text>
        <View className="flex-row gap-x-2">
          <Chip label="Tydzień" selected={scope === 'week'} onPress={() => setScope('week')} />
          <Chip label="Wszyscy" selected={scope === 'all'} onPress={() => setScope('all')} />
        </View>
      </View>

      {board.isLoading ? (
        <View className="flex-1 p-6">
          <Skeleton className="w-full h-32 rounded-xl mb-4" />
          <Skeleton className="w-full h-16 rounded-xl mb-2" />
          <Skeleton className="w-full h-16 rounded-xl mb-2" />
        </View>
      ) : board.error ? (
        <View className="p-6">
          <ErrorBanner message={errorMessage(board.error)} onRetry={() => board.refetch()} />
        </View>
      ) : (
        <FlatList
          data={rest}
          keyExtractor={(item) => `${item.rank}-${item.nickname}`}
          refreshControl={<RefreshControl refreshing={board.isRefetching} onRefresh={() => board.refetch()} />}
          ListEmptyComponent={
            items.length === 0 ? (
              <EmptyState title="Brak rankingu" message="Jeszcze nikt nie zdobył XP. Bądź pierwszy!" />
            ) : null
          }
          ListHeaderComponent={
            items.length > 0 ? (
              <View className="flex-row justify-center items-end py-8 bg-surface mb-2 border-b border-app-border">
                {renderPodiumItem(top3[1], 2)}
                {renderPodiumItem(top3[0], 1)}
                {renderPodiumItem(top3[2], 3)}
              </View>
            ) : null
          }
          ListFooterComponent={
            meOutsideTop ? (
              <View className="flex-row items-center px-6 py-4 bg-primary-light mt-2">
                <Text className="text-text-secondary font-bold w-8 text-center">{me.rank ?? '—'}</Text>
                <View className="ml-2 mr-4">
                  <Avatar nickname={me.nickname} size="sm" />
                </View>
                <Text className="flex-1 font-bold text-primary-dark">{me.nickname} (Ty)</Text>
                <Text className="font-bold text-text-secondary">{me.xp} XP</Text>
              </View>
            ) : null
          }
          renderItem={renderItem}
        />
      )}
    </View>
  );
}
