import type Database from "@tauri-apps/plugin-sql";
import { calculateNextReview as calculateLeitnerNextReview } from "@/lib/algorithms/leitner";
import { calculateNextReview as calculateSm2NextReview } from "@/lib/algorithms/sm2";
import { DEFAULT_EASE_FACTOR } from "@/lib/constants";
import { getDatabase } from "@/lib/repositories/remoteDb";
import type { Algorithm, Card, CardSchedulingState, Rating } from "@/lib/types";

interface CardRow {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  source: Card["source"] | null;
  created_at: string;
  updated_at: string;
}

interface SchedulingRow {
  id: string;
  card_id: string;
  algorithm: string | null;
  repetitions: number | null;
  interval_days: number | null;
  ease_factor: number | null;
  box_index: number | null;
  due_at: string;
  last_reviewed_at: string | null;
  lapse_count: number | null;
  review_count: number | null;
}

interface CountRow {
  count: number;
}

interface DayRow {
  day: string;
}


function mapCardRow(row: CardRow): Card {
  return {
    id: row.id,
    deckId: row.deck_id,
    front: row.front,
    back: row.back,
    source: row.source ?? "default",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSchedulingRow(row: SchedulingRow): CardSchedulingState {
  return {
    id: row.id,
    cardId: row.card_id,
    algorithm: row.algorithm === "leitner" ? "leitner" : "sm2",
    repetitions: row.repetitions ?? 0,
    intervalDays: row.interval_days ?? 0,
    easeFactor: row.ease_factor ?? DEFAULT_EASE_FACTOR,
    boxIndex: row.box_index ?? 0,
    dueAt: row.due_at,
    lastReviewedAt: row.last_reviewed_at,
    lapseCount: row.lapse_count ?? 0,
    reviewCount: row.review_count ?? 0,
  };
}

function getUtcDayBounds(now: Date): { start: string; nextStart: string } {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const nextStart = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return {
    start: start.toISOString(),
    nextStart: nextStart.toISOString(),
  };
}

function toUtcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function getSchedulingState(db: Database, cardId: string): Promise<CardSchedulingState> {
  const rows = await db.select<SchedulingRow[]>(
    "SELECT id, card_id, algorithm, repetitions, interval_days, ease_factor, box_index, due_at, last_reviewed_at, lapse_count, review_count FROM card_scheduling WHERE card_id = $1 LIMIT 1",
    [cardId],
  );

  const row = rows[0];
  if (!row) {
    throw new Error(`Scheduling state not found for card: ${cardId}`);
  }

  return mapSchedulingRow(row);
}

export async function getDueCards(algorithm: Algorithm): Promise<Card[]> {
  const db = await getDatabase();
  const nowIso = new Date().toISOString();
  const rows = await db.select<CardRow[]>(
    "SELECT c.id, c.deck_id, c.front, c.back, c.source, c.created_at, c.updated_at FROM cards c INNER JOIN card_scheduling s ON s.card_id = c.id WHERE s.algorithm = $1 AND s.due_at <= $2 ORDER BY s.due_at ASC",
    [algorithm, nowIso],
  );

  return rows.map(mapCardRow);
}

export async function getNextCard(algorithm: Algorithm): Promise<Card | null> {
  const db = await getDatabase();
  const nowIso = new Date().toISOString();
  const rows = await db.select<CardRow[]>(
    "SELECT c.id, c.deck_id, c.front, c.back, c.source, c.created_at, c.updated_at FROM cards c INNER JOIN card_scheduling s ON s.card_id = c.id WHERE s.algorithm = $1 AND s.due_at <= $2 ORDER BY s.due_at ASC LIMIT 1",
    [algorithm, nowIso],
  );

  const row = rows[0];
  return row ? mapCardRow(row) : null;
}

export async function submitReview(
  cardId: string,
  rating: Rating,
  algorithm: Algorithm,
): Promise<void> {
  const trimmedCardId = cardId.trim();
  if (!trimmedCardId) {
    throw new Error("Card id is required");
  }

  const db = await getDatabase();
  const now = new Date();
  const nowIso = now.toISOString();
  const state = await getSchedulingState(db, trimmedCardId);

  const nextState =
    algorithm === "sm2"
      ? calculateSm2NextReview({ ...state, algorithm }, rating, now)
      : calculateLeitnerNextReview({ ...state, algorithm }, rating >= 3, now);
  const shouldIncrementLapse =
    (algorithm === "sm2" && rating === 1) || (algorithm === "leitner" && rating <= 2);

  await db.execute("BEGIN TRANSACTION");

  try {
    await db.execute(
      "UPDATE card_scheduling SET algorithm = $1, repetitions = $2, interval_days = $3, ease_factor = $4, box_index = $5, due_at = $6, last_reviewed_at = $7, lapse_count = $8, review_count = $9 WHERE card_id = $10",
      [
        algorithm,
        nextState.repetitions,
        nextState.intervalDays,
        nextState.easeFactor,
        nextState.boxIndex,
        nextState.dueAt,
        nextState.lastReviewedAt,
        state.lapseCount + (shouldIncrementLapse ? 1 : 0),
        state.reviewCount + 1,
        trimmedCardId,
      ],
    );

    await db.execute(
      "INSERT INTO review_logs (id, card_id, reviewed_at, rating, response_type, elapsed_ms) VALUES ($1, $2, $3, $4, $5, $6)",
      [crypto.randomUUID(), trimmedCardId, nowIso, rating, "rated", 0],
    );

    await db.execute("COMMIT");
  } catch (error) {
    try {
      await db.execute("ROLLBACK");
    } catch (rollbackError) {
      const rollbackMsg = rollbackError instanceof Error ? rollbackError.message : String(rollbackError);
      if (error instanceof Error) {
        error.message += ` (rollback failed: ${rollbackMsg})`;
      }
    }

    throw error;
  }
}

export async function calculateStats(): Promise<{ due: number; reviewed: number; streak: number }> {
  const db = await getDatabase();
  const now = new Date();
  const nowIso = now.toISOString();
  const { start, nextStart } = getUtcDayBounds(now);

  const dueRows = await db.select<CountRow[]>(
    "SELECT COUNT(*) AS count FROM card_scheduling WHERE due_at <= $1",
    [nowIso],
  );
  const reviewedRows = await db.select<CountRow[]>(
    "SELECT COUNT(*) AS count FROM review_logs WHERE response_type = $1 AND reviewed_at >= $2 AND reviewed_at < $3",
    ["rated", start, nextStart],
  );
  const dayRows = await db.select<DayRow[]>(
    "SELECT DISTINCT substr(reviewed_at, 1, 10) AS day FROM review_logs WHERE response_type = $1 AND reviewed_at < $2 ORDER BY day DESC",
    ["rated", nextStart],
  );

  let streak = 0;
  const expectedDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  for (const row of dayRows) {
    const expectedKey = toUtcDateKey(expectedDate);
    if (row.day !== expectedKey) {
      break;
    }

    streak += 1;
    expectedDate.setUTCDate(expectedDate.getUTCDate() - 1);
  }

  return {
    due: dueRows[0]?.count ?? 0,
    reviewed: reviewedRows[0]?.count ?? 0,
    streak,
  };
}
