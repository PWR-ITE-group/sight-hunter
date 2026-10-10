import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getReelFeed, countReelView, likeReel, unlikeReel, listComments, addComment } from '../endpoints/reels';
import { queryKeys } from './queryKeys';

export function useReelFeed() {
  return useInfiniteQuery({
    queryKey: queryKeys.reelFeed,
    queryFn: ({ pageParam }) => getReelFeed(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    select: (data) => data.pages.flatMap((p) => p.items),
  });
}

export function useCountView() {
  return useMutation({ mutationFn: countReelView });
}

export function useLikeReel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: likeReel,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reelFeed });
    },
  });
}

export function useUnlikeReel() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: unlikeReel,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reelFeed });
    },
  });
}

export function useComments(reelId: string | null) {
  return useInfiniteQuery({
    queryKey: reelId ? queryKeys.comments(reelId) : [],
    queryFn: ({ pageParam }) => listComments(reelId!, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    select: (data) => data.pages.flatMap((p) => p.items),
    enabled: !!reelId,
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ reelId, text }: { reelId: string; text: string }) => addComment(reelId, text),
    onSuccess: (_, { reelId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments(reelId) });
    },
  });
}
