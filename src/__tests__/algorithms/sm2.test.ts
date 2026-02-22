import { describe, expect, it } from "vitest";

import { calculateNextReview } from "../../lib/algorithms/sm2";
import type { CardSchedulingState, Rating } from "../../lib/types";

const BASE_NOW = new Date("2026-01-01T00:00:00.000Z");

function buildState(overrides: Partial<CardSchedulingState> = {}): CardSchedulingState {
  return {
    id: "state-1",
    cardId: "card-1",
    algorithm: "sm2",
    repetitions: 0,
    intervalDays: 0,
    easeFactor: 2.5,
    boxIndex: 0,
    dueAt: BASE_NOW.toISOString(),
    lastReviewedAt: null,
    lapseCount: 0,
    reviewCount: 0,
    ...overrides,
  };
}

function expectedEf(currentEf: number, rating: Rating): number {
  const qMap: Record<Rating, number> = { 1: 2, 2: 3, 3: 4, 4: 5 };
  const q = qMap[rating];
  return currentEf + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
}

describe("calculateNextReview (SM-2)", () => {
  it("applies first successful review interval of 1 day", () => {
    const state = buildState({ repetitions: 0, intervalDays: 0, easeFactor: 2.5 });

    const result = calculateNextReview(state, 4, BASE_NOW);

    expect(result.repetitions).toBe(1);
    expect(result.intervalDays).toBe(1);
    expect(result.easeFactor).toBeCloseTo(expectedEf(2.5, 4), 10);
    expect(result.lastReviewedAt).toBe(BASE_NOW.toISOString());
    expect(result.dueAt).toBe("2026-01-02T00:00:00.000Z");
  });

  it("applies second successful review interval of 6 days", () => {
    const state = buildState({ repetitions: 1, intervalDays: 1, easeFactor: 2.5 });

    const result = calculateNextReview(state, 4, BASE_NOW);

    expect(result.repetitions).toBe(2);
    expect(result.intervalDays).toBe(6);
    expect(result.easeFactor).toBeCloseTo(expectedEf(2.5, 4), 10);
    expect(result.dueAt).toBe("2026-01-07T00:00:00.000Z");
  });

  it("applies subsequent interval as rounded previous interval times EF", () => {
    const state = buildState({ repetitions: 2, intervalDays: 6, easeFactor: 2.6 });

    const result = calculateNextReview(state, 3, BASE_NOW);

    expect(result.repetitions).toBe(3);
    expect(result.intervalDays).toBe(16);
    expect(result.easeFactor).toBeCloseTo(expectedEf(2.6, 3), 10);
    expect(result.dueAt).toBe("2026-01-17T00:00:00.000Z");
  });

  it("updates EF according to SM-2 formula using rating mapping 1->2, 2->3, 3->4, 4->5", () => {
    const state = buildState({ easeFactor: 2.5, repetitions: 2, intervalDays: 10 });

    const ratings: Rating[] = [1, 2, 3, 4];

    for (const rating of ratings) {
      const result = calculateNextReview(state, rating, BASE_NOW);
      expect(result.easeFactor).toBeCloseTo(expectedEf(2.5, rating), 10);
    }
  });

  it("enforces a minimum ease factor floor of 1.3", () => {
    const state = buildState({ easeFactor: 1.31, repetitions: 5, intervalDays: 30 });

    const result = calculateNextReview(state, 1, BASE_NOW);

    expect(result.easeFactor).toBe(1.3);
  });

  it("treats q < 3 as lapse and resets repetitions to 0 and interval to 1", () => {
    const state = buildState({ repetitions: 7, intervalDays: 42, easeFactor: 2.0 });

    const result = calculateNextReview(state, 1, BASE_NOW);

    expect(result.repetitions).toBe(0);
    expect(result.intervalDays).toBe(1);
    expect(result.lastReviewedAt).toBe(BASE_NOW.toISOString());
    expect(result.dueAt).toBe("2026-01-02T00:00:00.000Z");
  });
});
