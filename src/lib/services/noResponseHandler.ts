import type Database from "@tauri-apps/plugin-sql";
import { getDatabase } from "@/lib/repositories/remoteDb";
import type { Card } from "@/lib/types";

const NO_RESPONSE_BACKOFF_MINUTES = [10, 20, 30] as const;
const NO_RESPONSE_DAILY_CAP = 3;

interface CardRow {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  source: Card["source"] | null;
  created_at: string;
  updated_at: string;
}

interface CountRow {
  count: number;
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

function addMinutes(base: Date, minutes: number): string {
  return new Date(base.getTime() + minutes * 60 * 1000).toISOString();
}

async function getNoResponseCountForDay(
  db: Database,
  cardId: string,
  dayStartIso: string,
  nextDayStartIso: string,
): Promise<number> {
  const rows = await db.select<CountRow[]>(
    "SELECT COUNT(*) AS count FROM review_logs WHERE card_id = $1 AND response_type = $2 AND reviewed_at >= $3 AND reviewed_at < $4",
    [cardId, "no_response", dayStartIso, nextDayStartIso],
  );

  return rows[0]?.count ?? 0;
}

export async function recordNoResponse(cardId: string, reason: string): Promise<void> {
  const trimmedCardId = cardId.trim();
  const trimmedReason = reason.trim();

  if (!trimmedCardId) {
    throw new Error("Card id is required");
  }

  if (!trimmedReason) {
    throw new Error("No-response reason is required");
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const { start, nextStart } = getUtcDayBounds(now);
  const db = await getDatabase();

  await db.execute("BEGIN TRANSACTION");

  try {
    await db.execute(
      "INSERT INTO review_logs (id, card_id, reviewed_at, rating, response_type, elapsed_ms) VALUES ($1, $2, $3, $4, $5, $6)",
      [crypto.randomUUID(), trimmedCardId, nowIso, 0, "no_response", 0],
    );

    const todayCount = await getNoResponseCountForDay(db, trimmedCardId, start, nextStart);
    const backoffIndex = Math.min(
      Math.max(todayCount - 1, 0),
      NO_RESPONSE_BACKOFF_MINUTES.length - 1,
    );
    const deferredUntil =
      todayCount >= NO_RESPONSE_DAILY_CAP
        ? nextStart
        : addMinutes(now, NO_RESPONSE_BACKOFF_MINUTES[backoffIndex]);

    await db.execute("UPDATE card_scheduling SET due_at = $1 WHERE card_id = $2", [
      deferredUntil,
      trimmedCardId,
    ]);

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

export async function getDeferredCards(): Promise<Card[]> {
  const now = new Date();
  const nowIso = now.toISOString();
  const { start, nextStart } = getUtcDayBounds(now);
  const db = await getDatabase();
  const rows = await db.select<CardRow[]>(
    "SELECT c.id, c.deck_id, c.front, c.back, c.source, c.created_at, c.updated_at FROM cards c INNER JOIN card_scheduling s ON s.card_id = c.id LEFT JOIN (SELECT card_id, COUNT(*) AS no_response_count FROM review_logs WHERE response_type = $1 AND reviewed_at >= $2 AND reviewed_at < $3 GROUP BY card_id) daily ON daily.card_id = c.id WHERE (s.due_at > $4 AND COALESCE(daily.no_response_count, 0) > 0) OR s.due_at = $3 ORDER BY s.due_at ASC",
    ["no_response", start, nextStart, nowIso],
  );

  return rows.map(mapCardRow);
}

export async function shouldShowCard(cardId: string): Promise<boolean> {
  const trimmedCardId = cardId.trim();

  if (!trimmedCardId) {
    throw new Error("Card id is required");
  }

  const now = new Date();
  const { start, nextStart } = getUtcDayBounds(now);
  const db = await getDatabase();
  const todayCount = await getNoResponseCountForDay(db, trimmedCardId, start, nextStart);

  return todayCount < NO_RESPONSE_DAILY_CAP;
}
