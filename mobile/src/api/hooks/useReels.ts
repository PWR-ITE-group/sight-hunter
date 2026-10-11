import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getReelFeed, countReelView, listComments, addComment } from '../endpoints/reels';
import { queryKeys } from './queryKeys';

// The native tutorial replaces both mock and already-seeded API placeholders.
const LEGACY_TUTORIAL_IDS = new Set(['reel-how', '2890500e-4b68-59ba-85fc-579573a9603a']);

export function useReelFeed() {
  return useInfiniteQuery({
    queryKey: queryKeys.reelFeed,
    queryFn: ({ pageParam }) => getReelFeed(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    select: (data) => data.pages.flatMap((p) => p.items).filter((reel) => !LEGACY_TUTORIAL_IDS.has(reel.id)),
  });
}

export function useCountView() {
  return useMutation({ mutationFn: countReelView });
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
