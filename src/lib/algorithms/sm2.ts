import { DEFAULT_EASE_FACTOR, MIN_EASE_FACTOR } from "../constants"
import type { CardSchedulingState, Rating } from "../types"

const RATING_TO_Q: Record<Rating, number> = {
  1: 2,
  2: 3,
  3: 4,
  4: 5,
}

function calculateEaseFactor(currentEaseFactor: number, q: number): number {
  const nextEaseFactor =
    currentEaseFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))

  return Math.max(MIN_EASE_FACTOR, nextEaseFactor)
}

function addDays(date: Date, days: number): string {
  const due = new Date(date)
  due.setUTCDate(due.getUTCDate() + days)
  return due.toISOString()
}

export function calculateNextReview(
  state: CardSchedulingState,
  rating: Rating,
  now = new Date(),
): CardSchedulingState {
  const q = RATING_TO_Q[rating]
  const currentEaseFactor = state.easeFactor > 0 ? state.easeFactor : DEFAULT_EASE_FACTOR
  const easeFactor = calculateEaseFactor(currentEaseFactor, q)

  let repetitions = state.repetitions
  let intervalDays = state.intervalDays

  if (q < 3) {
    repetitions = 0
    intervalDays = 1
  } else {
    repetitions += 1
    if (repetitions === 1) {
      intervalDays = 1
    } else if (repetitions === 2) {
      intervalDays = 6
    } else {
      intervalDays = Math.round(state.intervalDays * easeFactor)
    }
  }

  const nowIso = now.toISOString()

  return {
    ...state,
    repetitions,
    intervalDays,
    easeFactor,
    dueAt: addDays(now, intervalDays),
    lastReviewedAt: nowIso,
  }
}
