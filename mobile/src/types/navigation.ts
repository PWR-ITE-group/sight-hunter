export type TaskScreenParams = {
  taskId: string;
};

export type VerifyScreenParams = {
  attemptId: string;
};

export type ReelScreenParams = {
  reelId: string;
};

export type ResultScreenParams = {
  pointsAwarded: string; // stringified number (URL params are strings)
  xpAwarded: string;
  reelId?: string;
};
