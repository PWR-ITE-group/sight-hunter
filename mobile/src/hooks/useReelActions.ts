import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useLikeReel,
  useUnlikeReel,
  useComments,
  useAddComment,
  useCountView,
} from '../api/hooks/useReels';
import { usePurchase } from '../api/hooks/useShop';
import { queryKeys } from '../api/hooks/queryKeys';
import { useAuthStore } from '../store/authStore';
import { Config } from '../constants/config';
import { errorMessage } from '../components/ui/ErrorBanner';
import type { Reel } from '../components/reels/ReelCard';

const VIEW_AFTER_MS = 3000;

/** Like, comment, share, buy and view-counting for reels; shared by the feed and the full-screen player. */
export function useReelActions() {
  const queryClient = useQueryClient();
  const refCode = useAuthStore((s) => s.user?.ref_code);

  const like = useLikeReel();
  const unlike = useUnlikeReel();
  const countView = useCountView();
  const purchase = usePurchase();
  const addComment = useAddComment();

  const [commentReelId, setCommentReelId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const comments = useComments(commentReelId);

  const viewed = useRef(new Set<string>());
  const viewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleLike = useCallback(
    (reel: Reel) => {
      const m = reel.liked_by_me ? unlike : like;
      m.mutate(reel.id, { onError: (e) => setError(errorMessage(e)) });
    },
    [like, unlike]
  );

  /** Call when a reel becomes the visible one; a view counts after ~3 s of playback. */
  const onActive = useCallback(
    (reelId: string | null) => {
      if (viewTimer.current) clearTimeout(viewTimer.current);
      if (!reelId || viewed.current.has(reelId)) return;
      viewTimer.current = setTimeout(() => {
        viewed.current.add(reelId);
        countView.mutate(reelId);
      }, VIEW_AFTER_MS);
    },
    [countView]
  );

  const buy = useCallback(
    (reel: Reel) => {
      purchase.mutate(reel.id, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.reelFeed }),
        onError: (e) => setError(errorMessage(e)),
      });
    },
    [purchase, queryClient]
  );

  const sendComment = useCallback(
    (text: string) => {
      if (!commentReelId) return;
      addComment.mutate({ reelId: commentReelId, text }, { onError: (e) => setError(errorMessage(e)) });
    },
    [addComment, commentReelId]
  );

  // The feed has no task to link to, so sharing invites with the player's referral code.
  const shareUrl = `${Config.SHARE_BASE_URL}/?ref=${refCode ?? ''}`;

  return {
    toggleLike,
    onActive,
    buy,
    buying: purchase.isPending,
    commentReelId,
    openComments: setCommentReelId,
    comments: comments.data ?? [],
    commentsLoading: comments.isLoading,
    sendComment,
    sending: addComment.isPending,
    shareOpen,
    setShareOpen,
    shareUrl,
    error,
    clearError: () => setError(null),
  };
}
