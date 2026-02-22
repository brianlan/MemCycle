import { describe, expect, it } from "vitest";
import type { CardSchedulingState } from "../../lib/types";
import { BOX_INTERVALS } from "../../lib/constants";
import { calculateNextReview } from "../../lib/algorithms/leitner";

const BASE_NOW = new Date("2026-01-01T00:00:00.000Z");

function createState(overrides: Partial<CardSchedulingState> = {}): CardSchedulingState {
  return {
    id: "state-1",
    cardId: "card-1",
    algorithm: "leitner",
    repetitions: 0,
    intervalDays: 0,
    easeFactor: 2.5,
    boxIndex: 0,
    dueAt: "2026-01-01T00:00:00.000Z",
    lastReviewedAt: null,
    lapseCount: 0,
    reviewCount: 0,
    ...overrides,
  };
}

describe("calculateNextReview", () => {
  it("keeps new cards in boxIndex 0 before first success", () => {
    const state = createState({ boxIndex: 0, lastReviewedAt: null });

    const result = calculateNextReview(state, false, BASE_NOW);

    expect(result.boxIndex).toBe(0);
    expect(result.dueAt).toBe("2026-01-02T00:00:00.000Z");
    expect(result.lastReviewedAt).toBe(BASE_NOW.toISOString());
  });

  it("advances one box on correct answer", () => {
    const state = createState({ boxIndex: 1 });

    const result = calculateNextReview(state, true, BASE_NOW);

    expect(result.boxIndex).toBe(2);
    expect(result.dueAt).toBe("2026-01-08T00:00:00.000Z");
  });

  it("resets to first box on incorrect answer", () => {
    const state = createState({ boxIndex: 3 });

    const result = calculateNextReview(state, false, BASE_NOW);

    expect(result.boxIndex).toBe(0);
    expect(result.dueAt).toBe("2026-01-02T00:00:00.000Z");
  });

  it("caps box progression at the maximum box index", () => {
    const state = createState({ boxIndex: BOX_INTERVALS.length - 1 });

    const result = calculateNextReview(state, true, BASE_NOW);

    expect(result.boxIndex).toBe(BOX_INTERVALS.length - 1);
    expect(result.dueAt).toBe("2026-01-31T00:00:00.000Z");
  });

  it("maps due intervals from BOX_INTERVALS by resulting box index", () => {
    const state = createState({ boxIndex: 0 });

    const result = calculateNextReview(state, true, BASE_NOW);
    const expectedDays = BOX_INTERVALS[result.boxIndex];
    const expectedDueAt = new Date(BASE_NOW);
    expectedDueAt.setUTCDate(expectedDueAt.getUTCDate() + expectedDays);

    expect(result.dueAt).toBe(expectedDueAt.toISOString());
  });
});
