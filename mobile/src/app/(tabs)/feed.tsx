import React, { useState } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { ReelCard } from '../../components/reels/ReelCard';
import { CommentSheet } from '../../components/reels/CommentSheet';
import { ShareSheet } from '../../components/reels/ShareSheet';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';

// Mock data
const MOCK_REELS = [
  {
    id: '1',
    title: 'Tajemnica Ratusza',
    thumbnail_url: 'https://images.unsplash.com/photo-1542384701-c0e46e0eda04?q=80&w=1280&auto=format&fit=crop',
    locked: false,
    finders_count: 142,
    likes_count: 56,
    comments_count: 12,
    liked_by_me: false,
  },
  {
    id: '2',
    title: 'Ukryte Krasnale',
    thumbnail_url: 'https://images.unsplash.com/photo-1627885408713-9a3b680cbf37?q=80&w=1280&auto=format&fit=crop',
    locked: true,
    price_points: 150,
    finders_count: 89,
  },
  {
    id: '3',
    title: 'Most Grunwaldzki',
    thumbnail_url: 'https://images.unsplash.com/photo-1596700085420-94e82df283be?q=80&w=1280&auto=format&fit=crop',
    locked: false,
    finders_count: 320,
    likes_count: 210,
    comments_count: 45,
    liked_by_me: true,
  }
];

export default function FeedTab() {
  const [reels, setReels] = useState<any[]>(MOCK_REELS);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [activeCommentReel, setActiveCommentReel] = useState<string | null>(null);
  const [activeShareReel, setActiveShareReel] = useState<string | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  const handleLike = (id: string) => {
    setReels(prev => prev.map(r => {
      if (r.id === id) {
        return {
          ...r,
          liked_by_me: !r.liked_by_me,
          likes_count: r.liked_by_me ? (r.likes_count || 1) - 1 : (r.likes_count || 0) + 1
        };
      }
      return r;
    }));
  };

  return (
    <View className="flex-1 bg-black">
      {loading ? (
        <View className="flex-1 p-4 bg-black">
          <Skeleton className="w-full h-[80%] rounded-2xl mb-4" />
        </View>
      ) : (
        <FlatList
          data={reels}
          keyExtractor={item => item.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<EmptyState title="Brak rolek" message="Nie ma jeszcze żadnych rolek." />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
          }
          renderItem={({ item }) => (
            <ReelCard 
              reel={item}
              onLike={() => handleLike(item.id)}
              onComment={() => setActiveCommentReel(item.id)}
              onShare={() => setActiveShareReel(item.id)}
              onView={() => console.log('Viewed', item.id)}
              onUnlock={() => console.log('Unlock', item.id)}
            />
          )}
        />
      )}

      <CommentSheet 
        visible={!!activeCommentReel}
        onClose={() => setActiveCommentReel(null)}
        comments={[]} // Mock comments
        onAdd={(text) => console.log('Added comment', text)}
      />

      <ShareSheet 
        visible={!!activeShareReel}
        onClose={() => setActiveShareReel(null)}
        url={`https://sight-hunter.com/reel/${activeShareReel}`}
      />
    </View>
  );
}
