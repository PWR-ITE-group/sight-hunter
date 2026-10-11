import React, { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { View, FlatList, RefreshControl, useWindowDimensions, type ViewToken } from 'react-native';
import { ReelCard, type Reel } from '../../components/reels/ReelCard';
import { CommentSheet } from '../../components/reels/CommentSheet';
import { ShareSheet } from '../../components/reels/ShareSheet';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorBanner, errorMessage } from '../../components/ui/ErrorBanner';
import { useReelFeed } from '../../api/hooks/useReels';
import { useReelActions } from '../../hooks/useReelActions';

const TAB_BAR_HEIGHT = 80;
const VIEWABILITY_CONFIG = { itemVisiblePercentThreshold: 60 };

export default function FeedTab() {
  const { height: windowHeight } = useWindowDimensions();
  const itemHeight = windowHeight - TAB_BAR_HEIGHT;

  const feed = useReelFeed();
  const actions = useReelActions();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  // Tab screens stay mounted; without this the reel would keep playing under the map or a modal.
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => {
        setFocused(false);
        actions.onActive(null);
      };
    }, [actions])
  );

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<Reel>[] }) => {
      const first = viewableItems[0]?.item ?? null;
      const id = first && !first.locked ? first.id : null;
      setActiveId(id);
      actions.onActive(id);
    },
    [actions]
  );

  const reels = feed.data ?? [];

  if (feed.isLoading) {
    return (
      <View className="flex-1 p-4 bg-black">
        <Skeleton className="w-full h-[80%] rounded-2xl mb-4" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      {(feed.error || actions.error) && (
        <View className="absolute top-12 left-4 right-4 z-10">
          <ErrorBanner
            message={actions.error ?? errorMessage(feed.error)}
            onRetry={feed.error ? () => feed.refetch() : undefined}
            onDismiss={actions.error ? actions.clearError : undefined}
          />
        </View>
      )}

      <FlatList
        data={reels}
        keyExtractor={(item) => item.id}
        pagingEnabled
        snapToInterval={itemHeight}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        viewabilityConfig={VIEWABILITY_CONFIG}
        onViewableItemsChanged={onViewableItemsChanged}
        onEndReached={() => feed.hasNextPage && feed.fetchNextPage()}
        onEndReachedThreshold={1}
        ListEmptyComponent={
          <View style={{ height: itemHeight }}>
            <EmptyState title="Brak rolek" message="Znajdź pierwsze miejsce, aby odblokować jego historię." />
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={feed.isRefetching} onRefresh={() => feed.refetch()} tintColor="#fff" />
        }
        renderItem={({ item }) => (
          <ReelCard
            reel={item}
            height={itemHeight}
            isActive={focused && item.id === activeId}
            onComment={() => actions.openComments(item.id)}
            onShare={() => actions.setShareOpen(true)}
            onUnlock={() => actions.buy(item)}
            unlocking={actions.buying}
          />
        )}
      />

      <CommentSheet
        visible={!!actions.commentReelId}
        onClose={() => actions.openComments(null)}
        comments={actions.comments}
        loading={actions.commentsLoading}
        sending={actions.sending}
        onAdd={actions.sendComment}
      />

      <ShareSheet visible={actions.shareOpen} onClose={() => actions.setShareOpen(false)} url={actions.shareUrl} />
    </View>
  );
}
