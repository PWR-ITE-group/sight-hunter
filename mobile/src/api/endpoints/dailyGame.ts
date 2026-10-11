import { components } from '../schema';
import { apiClient } from '../client';

type DailyGame = components['schemas']['DailyGame'];
type DailyGameResult = components['schemas']['DailyGameResult'];

export async function getDailyGame(): Promise<DailyGame> {
  return apiClient('GET', '/daily-game');
}

export async function startDailyGame(): Promise<{ started_at: string }> {
  return apiClient('POST', '/daily-game/start');
}

export async function submitDailyAnswers(
  answers: { question_id: string; option_index: number }[]
): Promise<DailyGameResult> {
  return apiClient('POST', '/daily-game/answers', { body: { answers } });
}
