import type Database from "@tauri-apps/plugin-sql";
import { BOX_INTERVALS, DEFAULT_EASE_FACTOR } from "@/lib/constants";
import { getDatabase } from "@/lib/repositories/remoteDb";
import type {
  Algorithm,
  Card,
  CardSchedulingState,
  CardSource,
} from "@/lib/types";

type CardUpdates = Partial<Pick<Card, "front" | "back" | "source">>;

interface CardRow {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  source: string | null;
  created_at: string;
  updated_at: string;
}

interface CardWithSchedulingRow {
  card_id: string;
  deck_id: string;
  front: string;
  back: string;
  source: string | null;
  card_created_at: string;
  card_updated_at: string;
  scheduling_id: string;
  scheduling_card_id: string;
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

interface SettingRow {
  value: string;
}

const VALID_CARD_SOURCES: readonly CardSource[] = ["default", "collinsdictionary"];

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown database error";
}

function mapDatabaseError(error: unknown): never {
  const message = toErrorMessage(error);

  if (message.includes("FOREIGN KEY constraint failed")) {
    throw new Error("Deck not found");
  }

  if (
    message.includes("NOT NULL constraint failed") &&
    (message.includes("cards.front") || message.includes("cards.back"))
  ) {
    throw new Error("Card front and back are required");
  }

  throw new Error(`Card repository error: ${message}`);
}

function mapCardRow(row: CardRow): Card {
  const source = row.source ?? "default";

  if (!isValidCardSource(source)) {
    throw new Error(`Invalid card source in database: ${source}`);
  }

  return {
    id: row.id,
    deckId: row.deck_id,
    front: row.front,
    back: row.back,
    source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isValidCardSource(source: string): source is CardSource {
  return VALID_CARD_SOURCES.includes(source as CardSource);
}

function ensureCardSource(source: string): CardSource {
  if (!isValidCardSource(source)) {
    throw new Error("Card source must be 'default' or 'collinsdictionary'");
  }

  return source;
}

async function getCardRow(id: string): Promise<CardRow | null> {
  const db = await getDatabase();
  const rows = await db.select<CardRow[]>(
    "SELECT id, deck_id, front, back, source, created_at, updated_at FROM cards WHERE id = $1 LIMIT 1",
    [id],
  );

  return rows[0] ?? null;
}

async function getDefaultAlgorithm(db: Database): Promise<Algorithm> {
  const rows = await db.select<SettingRow[]>(
    "SELECT value FROM settings WHERE key = $1 LIMIT 1",
    ["algorithm"],
  );
  const value = rows[0]?.value;

  if (value === "leitner" || value === "sm2") {
    return value;
  }

  return "sm2";
}

export async function createCard(
  deckId: string,
  front: string,
  back: string,
  source: CardSource,
): Promise<Card> {
  const nextSource = ensureCardSource(source);
  const nextFront = front.trim();
  const nextBack = back.trim();

  if (!nextFront || !nextBack) {
    throw new Error("Card front and back are required");
  }

  const db = await getDatabase();
  const cardId = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    const algorithm = await getDefaultAlgorithm(db);
    const intervalDays = algorithm === "leitner" ? BOX_INTERVALS[0] : 0;

    await db.execute("BEGIN TRANSACTION");
    await db.execute(
      "INSERT INTO cards (id, deck_id, front, back, source, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [cardId, deckId, nextFront, nextBack, nextSource, now, now],
    );

    await db.execute(
      "INSERT INTO card_scheduling (id, card_id, algorithm, repetitions, interval_days, ease_factor, box_index, due_at, last_reviewed_at, lapse_count, review_count) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
      [
        cardId,
        cardId,
        algorithm,
        0,
        intervalDays,
        DEFAULT_EASE_FACTOR,
        0,
        now,
        null,
        0,
        0,
      ],
    );
    await db.execute("COMMIT");

    const created = await getCardRow(cardId);
    if (!created) {
      throw new Error("Failed to create card");
    }

    return mapCardRow(created);
  } catch (error) {
    try {
      await db.execute("ROLLBACK");
    } catch (rollbackError) {
      const rollbackMsg = rollbackError instanceof Error ? rollbackError.message : String(rollbackError);
      if (error instanceof Error) {
        error.message += ` (rollback failed: ${rollbackMsg})`;
      }
    }

    mapDatabaseError(error);
  }
}

export async function getCards(deckId?: string): Promise<Card[]> {
  const db = await getDatabase();

  try {
    const query = deckId
      ? "SELECT id, deck_id, front, back, source, created_at, updated_at FROM cards WHERE deck_id = $1 ORDER BY created_at DESC"
      : "SELECT id, deck_id, front, back, source, created_at, updated_at FROM cards ORDER BY created_at DESC";
    const params = deckId ? [deckId] : [];
    const rows = await db.select<CardRow[]>(query, params);

    return rows.map(mapCardRow);
  } catch (error) {
    mapDatabaseError(error);
  }
}

export async function getCard(id: string): Promise<Card | null> {
  try {
    const row = await getCardRow(id);
    return row ? mapCardRow(row) : null;
  } catch (error) {
    mapDatabaseError(error);
  }
}

export async function updateCard(id: string, updates: CardUpdates): Promise<Card> {
  const existing = await getCardRow(id);

  if (!existing) {
    throw new Error(`Card not found: ${id}`);
  }

  const nextFront = updates.front === undefined ? existing.front : updates.front.trim();
  const nextBack = updates.back === undefined ? existing.back : updates.back.trim();
  const nextSource = updates.source === undefined ? (existing.source ?? "default") : updates.source;

  if (!nextFront || !nextBack) {
    throw new Error("Card front and back are required");
  }

  ensureCardSource(nextSource);

  const db = await getDatabase();
  const now = new Date().toISOString();

  try {
    await db.execute(
      "UPDATE cards SET front = $1, back = $2, source = $3, updated_at = $4 WHERE id = $5",
      [nextFront, nextBack, nextSource, now, id],
    );

    const updated = await getCardRow(id);
    if (!updated) {
      throw new Error(`Card not found: ${id}`);
    }

    return mapCardRow(updated);
  } catch (error) {
    mapDatabaseError(error);
  }
}

export async function deleteCard(id: string): Promise<void> {
  const db = await getDatabase();

  try {
    const result = await db.execute("DELETE FROM cards WHERE id = $1", [id]);

    if (result.rowsAffected === 0) {
      throw new Error(`Card not found: ${id}`);
    }
  } catch (error) {
    mapDatabaseError(error);
  }
}

export async function getCardWithScheduling(id: string): Promise<Card & CardSchedulingState> {
  const db = await getDatabase();

  try {
    const rows = await db.select<CardWithSchedulingRow[]>(
      "SELECT c.id AS card_id, c.deck_id, c.front, c.back, c.source, c.created_at AS card_created_at, c.updated_at AS card_updated_at, s.id AS scheduling_id, s.card_id AS scheduling_card_id, s.algorithm, s.repetitions, s.interval_days, s.ease_factor, s.box_index, s.due_at, s.last_reviewed_at, s.lapse_count, s.review_count FROM cards c INNER JOIN card_scheduling s ON s.card_id = c.id WHERE c.id = $1 LIMIT 1",
      [id],
    );
    const row = rows[0];

    if (!row) {
      throw new Error(`Card not found: ${id}`);
    }

    const source = row.source ?? "default";
    if (!isValidCardSource(source)) {
      throw new Error(`Invalid card source in database: ${source}`);
    }

    const algorithm = row.algorithm === "leitner" ? "leitner" : "sm2";

    return {
      id: row.card_id,
      deckId: row.deck_id,
      front: row.front,
      back: row.back,
      source,
      createdAt: row.card_created_at,
      updatedAt: row.card_updated_at,
      cardId: row.scheduling_card_id,
      algorithm,
      repetitions: row.repetitions ?? 0,
      intervalDays: row.interval_days ?? 0,
      easeFactor: row.ease_factor ?? DEFAULT_EASE_FACTOR,
      boxIndex: row.box_index ?? 0,
      dueAt: row.due_at,
      lastReviewedAt: row.last_reviewed_at,
      lapseCount: row.lapse_count ?? 0,
      reviewCount: row.review_count ?? 0,
    };
  } catch (error) {
    mapDatabaseError(error);
  }
}
