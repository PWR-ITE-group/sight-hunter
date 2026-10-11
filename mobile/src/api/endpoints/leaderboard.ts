import { components } from '../schema';
import { apiClient } from '../client';

type LeaderboardEntry = components['schemas']['LeaderboardEntry'];

export async function getLeaderboard(
  scope: 'week' | 'all' = 'week'
): Promise<{ items: LeaderboardEntry[]; me: LeaderboardEntry }> {
  return apiClient('GET', '/leaderboard', { params: { scope } });
}
