import { BOX_INTERVALS } from "../constants";
import type { CardSchedulingState } from "../types";

export function calculateNextReview(
  state: CardSchedulingState,
  isCorrect: boolean,
  now: Date = new Date(),
): CardSchedulingState {
  const maxBoxIndex = BOX_INTERVALS.length - 1;
  const nextBoxIndex = isCorrect ? Math.min(state.boxIndex + 1, maxBoxIndex) : 0;
  const intervalDays = BOX_INTERVALS[nextBoxIndex];

  const dueDate = new Date(now);
  dueDate.setUTCDate(dueDate.getUTCDate() + intervalDays);

  return {
    ...state,
    boxIndex: nextBoxIndex,
    intervalDays,
    dueAt: dueDate.toISOString(),
    lastReviewedAt: now.toISOString(),
  };
}
