import { components } from '../schema';
import { apiClient } from '../client';

type Reel = components['schemas']['Reel'];
type Comment = components['schemas']['Comment'];

export async function getReelFeed(cursor?: string): Promise<{ items: Reel[]; next_cursor: string | null }> {
  const params: Record<string, string> = {};
  if (cursor) params.cursor = cursor;
  return apiClient('GET', '/reels/feed', { params });
}

export async function countReelView(reelId: string): Promise<void> {
  return apiClient('POST', `/reels/${reelId}/views`);
}

export async function likeReel(reelId: string): Promise<void> {
  return apiClient('PUT', `/reels/${reelId}/like`);
}

export async function unlikeReel(reelId: string): Promise<void> {
  return apiClient('DELETE', `/reels/${reelId}/like`);
}

export async function listComments(
  reelId: string,
  cursor?: string
): Promise<{ items: Comment[]; next_cursor: string | null }> {
  const params: Record<string, string> = {};
  if (cursor) params.cursor = cursor;
  return apiClient('GET', `/reels/${reelId}/comments`, { params });
}

export async function addComment(reelId: string, text: string): Promise<Comment> {
  return apiClient('POST', `/reels/${reelId}/comments`, { body: { text } });
}
