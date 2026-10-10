import React, { useState } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { Avatar } from '../../components/ui/Avatar';
import { Chip } from '../../components/ui/Chip';
import { Crown } from 'lucide-react-native';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';

const MOCK_LEADERBOARD = Array.from({ length: 50 }).map((_, i) => ({
  id: `u${i}`,
  rank: i + 1,
  nickname: i === 0 ? 'WroclawKing' : i === 1 ? 'HistoryBuff' : i === 2 ? 'Explorer99' : `User${i}`,
  xp: 15000 - i * 120,
  avatarUrl: `https://i.pravatar.cc/150?u=${i}`,
  isMe: i === 12
}));

export default function RankingTab() {
  const [scope, setScope] = useState<'week' | 'all'>('week');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  const top3 = MOCK_LEADERBOARD.slice(0, 3);
  const rest = MOCK_LEADERBOARD.slice(3);

  const renderPodiumItem = (user: any, position: number) => {
    const isFirst = position === 1;
    const size = isFirst ? 'lg' : 'md';
    const color = isFirst ? '#FBBF24' : position === 2 ? '#9CA3AF' : '#B45309';
    
    return (
      <View className="items-center mx-2" style={{ marginTop: isFirst ? 0 : 20 }}>
        <View className="mb-2 relative">
          <Avatar uri={user.avatarUrl} nickname={user.nickname} size={size} />
          {isFirst && (
            <View className="absolute -top-4 -right-2 transform rotate-12">
              <Crown color={color} size={28} fill={color} />
            </View>
          )}
        </View>
        <Text className="font-bold text-app-text text-sm mb-1">{user.nickname}</Text>
        <Text className="text-primary font-bold">{user.xp} XP</Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: typeof MOCK_LEADERBOARD[0] }) => (
    <View className={`flex-row items-center px-6 py-4 border-b border-border ${item.isMe ? 'bg-primaryLight' : 'bg-surface'}`}>
      <Text className="text-textSecondary font-bold w-8 text-center">{item.rank}</Text>
      <View className="ml-2 mr-4">
        <Avatar uri={item.avatarUrl} nickname={item.nickname} size="sm" />
      </View>
      <Text className={`flex-1 font-bold ${item.isMe ? 'text-primaryDark' : 'text-app-text'}`}>
        {item.nickname} {item.isMe ? '(Ty)' : ''}
      </Text>
      <Text className="font-bold text-textSecondary">{item.xp} XP</Text>
    </View>
  );

  return (
    <View className="flex-1 bg-background">
      <View className="pt-16 pb-4 px-6 items-center bg-surface shadow-sm z-10">
        <Text className="text-2xl font-bold text-app-text mb-4">Ranking</Text>
        <View className="flex-row gap-x-2">
          <Chip label="Tydzień" selected={scope === 'week'} onPress={() => setScope('week')} />
          <Chip label="Wszyscy" selected={scope === 'all'} onPress={() => setScope('all')} />
        </View>
      </View>

      {loading ? (
        <View className="flex-1 p-6">
          <Skeleton className="w-full h-32 rounded-xl mb-4" />
          <Skeleton className="w-full h-16 rounded-xl mb-2" />
          <Skeleton className="w-full h-16 rounded-xl mb-2" />
          <Skeleton className="w-full h-16 rounded-xl mb-2" />
        </View>
      ) : (
        <FlatList
          data={rest}
          keyExtractor={item => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<EmptyState title="Brak rankingu" message="Jeszcze nikt nie zdobył punktów." />}
          ListHeaderComponent={
            <View className="flex-row justify-center items-end py-8 bg-surface mb-2 border-b border-border">
              {renderPodiumItem(top3[1], 2)}
              {renderPodiumItem(top3[0], 1)}
              {renderPodiumItem(top3[2], 3)}
            </View>
          }
          renderItem={renderItem}
        />
      )}
    </View>
  );
}
