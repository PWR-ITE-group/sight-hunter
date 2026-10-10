export const queryKeys = {
  me: ['me'] as const,
  nearbyPlaces: (lat: number, lng: number) => ['places', 'nearby', lat, lng] as const,
  task: (id: string) => ['task', id] as const,
  attempt: (id: string) => ['attempt', id] as const,
  reelFeed: ['reels', 'feed'] as const,
  comments: (reelId: string) => ['reels', reelId, 'comments'] as const,
  dailyGame: ['daily-game'] as const,
  leaderboard: (scope: string) => ['leaderboard', scope] as const,
  shopItems: ['shop', 'items'] as const,
} as const;
