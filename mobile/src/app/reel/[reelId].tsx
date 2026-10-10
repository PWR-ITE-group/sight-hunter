import React, { useEffect } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { ReelCard } from '../../components/reels/ReelCard';
import { CommentSheet } from '../../components/reels/CommentSheet';
import { ShareSheet } from '../../components/reels/ShareSheet';
import { IconButton } from '../../components/ui/IconButton';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { ErrorBanner } from '../../components/ui/ErrorBanner';
import { useReelFeed } from '../../api/hooks/useReels';
import { useReelActions } from '../../hooks/useReelActions';

/** Full-screen player for one reel (opened from the result screen or the profile). */
export default function ReelScreen() {
  const router = useRouter();
  const { reelId } = useLocalSearchParams<{ reelId: string }>();
  const { height } = useWindowDimensions();
  const feed = useReelFeed();
  const actions = useReelActions();

  const reel = feed.data?.find((r) => r.id === reelId) ?? null;

  // The feed is ordered by creation date, so a freshly unlocked reel can sit on a later page.
  useEffect(() => {
    if (!reel && feed.hasNextPage && !feed.isFetchingNextPage) {
      feed.fetchNextPage();
    }
  }, [reel, feed]);
  const searching = !reel && (feed.isLoading || feed.hasNextPage || feed.isFetchingNextPage);

  useEffect(() => {
    actions.onActive(reel && !reel.locked ? reel.id : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reel?.id, reel?.locked]);

  return (
    <View className="flex-1 bg-black">
      {searching ? (
        <LoadingSpinner className="flex-1" color="#fff" size={40} />
      ) : reel ? (
        <ReelCard
          reel={reel}
          height={height}
          isActive
          onLike={() => actions.toggleLike(reel)}
          onComment={() => actions.openComments(reel.id)}
          onShare={() => actions.setShareOpen(true)}
          onUnlock={() => actions.buy(reel)}
          unlocking={actions.buying}
        />
      ) : (
        <View className="flex-1 justify-center p-6">
          <EmptyState title="Nie znaleziono rolki" message="Ta historia nie jest jeszcze dostępna." />
          <Button title="Wróć" variant="outline" onPress={() => router.back()} />
        </View>
      )}

      <View className="absolute top-12 left-4">
        <IconButton icon={<X size={24} color="#fff" />} onPress={() => router.back()} size={44} color="rgba(0,0,0,0.4)" />
      </View>

      {actions.error && (
        <View className="absolute top-12 left-16 right-4">
          <ErrorBanner message={actions.error} onDismiss={actions.clearError} />
        </View>
      )}

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
