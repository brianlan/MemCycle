import { invoke } from "@tauri-apps/api/core";
import type {
  Algorithm,
  Card,
  CardSchedulingState,
  ImportResult,
  ReviewLog,
  ValidationResult,
} from "@/lib/types";
import type { Deck } from "@/lib/types";
import { getDatabase } from "@/lib/repositories/remoteDb";

const EXPORT_VERSION = "1.0";
const SENSITIVE_SETTING_KEYS = new Set(["llmApiKey"]);

interface DeckRow {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface CardWithSchedulingRow {
  card_id: string;
  deck_id: string;
  front: string;
  back: string;
  source: string;
  card_created_at: string;
  card_updated_at: string;
  scheduling_id: string;
  scheduling_card_id: string;
  algorithm: string;
  repetitions: number | null;
  interval_days: number | null;
  ease_factor: number | null;
  box_index: number | null;
  due_at: string;
  last_reviewed_at: string | null;
  lapse_count: number | null;
  review_count: number | null;
}

interface ReviewLogRow {
  id: string;
  card_id: string;
  reviewed_at: string;
  rating: number;
  response_type: string;
  elapsed_ms: number;
}

interface SettingRow {
  key: string;
  value: string;
}

export interface ExportCard extends Card {
  scheduling: CardSchedulingState;
}

export interface ExportPayload {
  version: typeof EXPORT_VERSION;
  exportedAt: string;
  decks: Deck[];
  cards: ExportCard[];
  reviewLogs?: ReviewLog[];
  settings: Record<string, string>;
}

export interface ImportOptions {
  includeReviewLogs?: boolean;
  replaceExistingData?: boolean;
}

function normalizeAlgorithm(algorithm: string): Algorithm {
  return algorithm === "leitner" ? "leitner" : "sm2";
}

function mapDeckRow(row: DeckRow): Deck {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCardRow(row: CardWithSchedulingRow): ExportCard {
  return {
    id: row.card_id,
    deckId: row.deck_id,
    front: row.front,
    back: row.back,
    source: row.source === "collinsdictionary" ? "collinsdictionary" : "default",
    createdAt: row.card_created_at,
    updatedAt: row.card_updated_at,
    scheduling: {
      id: row.scheduling_id,
      cardId: row.scheduling_card_id,
      algorithm: normalizeAlgorithm(row.algorithm),
      repetitions: row.repetitions ?? 0,
      intervalDays: row.interval_days ?? 0,
      easeFactor: row.ease_factor ?? 2.5,
      boxIndex: row.box_index ?? 0,
      dueAt: row.due_at,
      lastReviewedAt: row.last_reviewed_at,
      lapseCount: row.lapse_count ?? 0,
      reviewCount: row.review_count ?? 0,
    },
  };
}

function mapReviewLogRow(row: ReviewLogRow): ReviewLog {
  return {
    id: row.id,
    cardId: row.card_id,
    reviewedAt: row.reviewed_at,
    rating: row.rating === 1 || row.rating === 2 || row.rating === 3 ? row.rating : 4,
    responseType:
      row.response_type === "no_response"
        ? "no_response"
        : row.response_type === "skipped"
          ? "skipped"
          : "rated",
    elapsedMs: row.elapsed_ms,
  };
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  return !Number.isNaN(Date.parse(value));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function resolveDeckNameConflict(baseName: string, usedNames: Set<string>): string {
  if (!usedNames.has(baseName)) {
    return baseName;
  }

  let candidate = `${baseName} (imported)`;
  if (!usedNames.has(candidate)) {
    return candidate;
  }

  let suffix = 2;
  while (usedNames.has(`${candidate} ${suffix}`)) {
    suffix += 1;
  }

  return `${candidate} ${suffix}`;
}

function parseImportPayload(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function exportData(includeReviewLogs = true): Promise<string> {
  const db = await getDatabase();

  const [decks, cards, settings, reviewLogs] = await Promise.all([
    db.select<DeckRow[]>(
      "SELECT id, name, description, created_at, updated_at FROM decks ORDER BY created_at ASC",
    ),
    db.select<CardWithSchedulingRow[]>(
      "SELECT c.id AS card_id, c.deck_id, c.front, c.back, c.source, c.created_at AS card_created_at, c.updated_at AS card_updated_at, s.id AS scheduling_id, s.card_id AS scheduling_card_id, s.algorithm, s.repetitions, s.interval_days, s.ease_factor, s.box_index, s.due_at, s.last_reviewed_at, s.lapse_count, s.review_count FROM cards c INNER JOIN card_scheduling s ON s.card_id = c.id ORDER BY c.created_at ASC",
    ),
    db.select<SettingRow[]>(
      "SELECT key, value FROM settings WHERE key != $1 ORDER BY key ASC",
      ["llmApiKey"],
    ),
    includeReviewLogs
      ? db.select<ReviewLogRow[]>(
          "SELECT r.id, r.card_id, r.reviewed_at, r.rating, r.response_type, r.elapsed_ms FROM review_logs r INNER JOIN cards c ON c.id = r.card_id INNER JOIN card_scheduling s ON s.card_id = c.id ORDER BY r.reviewed_at ASC",
        )
      : Promise.resolve([]),
  ]);

  const payload: ExportPayload = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    decks: decks.map(mapDeckRow),
    cards: cards.map(mapCardRow),
    settings: Object.fromEntries(
      settings
        .filter((entry) => !SENSITIVE_SETTING_KEYS.has(entry.key))
        .map((entry) => [entry.key, entry.value]),
    ),
  };

  if (includeReviewLogs) {
    payload.reviewLogs = reviewLogs.map(mapReviewLogRow);
  }

  return JSON.stringify(payload, null, 2);
}

export function validateImport(jsonData: string): ValidationResult {
  const parsed = parseImportPayload(jsonData);
  const errors: string[] = [];

  if (!isObject(parsed)) {
    return { isValid: false, errors: ["JSON payload must be an object"] };
  }

  if (parsed.version !== EXPORT_VERSION) {
    errors.push(`version must be '${EXPORT_VERSION}'`);
  }

  if (!isIsoDate(parsed.exportedAt)) {
    errors.push("exportedAt must be an ISO date string");
  }

  const decks = Array.isArray(parsed.decks) ? parsed.decks : null;
  const cards = Array.isArray(parsed.cards) ? parsed.cards : null;
  const reviewLogs = parsed.reviewLogs;
  const settings = isObject(parsed.settings) ? parsed.settings : null;

  if (!decks) {
    errors.push("decks must be an array");
  }

  if (!cards) {
    errors.push("cards must be an array");
  }

  if (reviewLogs !== undefined && !Array.isArray(reviewLogs)) {
    errors.push("reviewLogs must be an array when provided");
  }

  if (!settings) {
    errors.push("settings must be an object");
  }

  const deckIds = new Set<string>();
  if (decks) {
    for (let index = 0; index < decks.length; index += 1) {
      const deck = decks[index];
      if (!isObject(deck)) {
        errors.push(`decks[${index}] must be an object`);
        continue;
      }

      if (typeof deck.id !== "string" || deck.id.length === 0) {
        errors.push(`decks[${index}].id must be a non-empty string`);
      } else {
        deckIds.add(deck.id);
      }

      if (typeof deck.name !== "string" || deck.name.trim().length === 0) {
        errors.push(`decks[${index}].name must be a non-empty string`);
      }

      if (typeof deck.description !== "string") {
        errors.push(`decks[${index}].description must be a string`);
      }

      if (!isIsoDate(deck.createdAt)) {
        errors.push(`decks[${index}].createdAt must be an ISO date string`);
      }

      if (!isIsoDate(deck.updatedAt)) {
        errors.push(`decks[${index}].updatedAt must be an ISO date string`);
      }
    }
  }

  const cardIds = new Set<string>();
  if (cards) {
    for (let index = 0; index < cards.length; index += 1) {
      const card = cards[index];
      if (!isObject(card)) {
        errors.push(`cards[${index}] must be an object`);
        continue;
      }

      if (typeof card.id !== "string" || card.id.length === 0) {
        errors.push(`cards[${index}].id must be a non-empty string`);
      } else {
        cardIds.add(card.id);
      }

      if (typeof card.deckId !== "string" || !deckIds.has(card.deckId)) {
        errors.push(`cards[${index}].deckId must reference an existing deck id`);
      }

      if (typeof card.front !== "string") {
        errors.push(`cards[${index}].front must be a string`);
      }

      if (typeof card.back !== "string") {
        errors.push(`cards[${index}].back must be a string`);
      }

      if (card.source !== "default" && card.source !== "collinsdictionary") {
        errors.push(`cards[${index}].source must be 'default' or 'collinsdictionary'`);
      }

      if (!isIsoDate(card.createdAt)) {
        errors.push(`cards[${index}].createdAt must be an ISO date string`);
      }

      if (!isIsoDate(card.updatedAt)) {
        errors.push(`cards[${index}].updatedAt must be an ISO date string`);
      }

      if (!isObject(card.scheduling)) {
        errors.push(`cards[${index}].scheduling must be an object`);
        continue;
      }

      const scheduling = card.scheduling;
      if (typeof scheduling.id !== "string" || scheduling.id.length === 0) {
        errors.push(`cards[${index}].scheduling.id must be a non-empty string`);
      }

      if (typeof scheduling.cardId !== "string" || scheduling.cardId !== card.id) {
        errors.push(`cards[${index}].scheduling.cardId must match cards[${index}].id`);
      }

      if (scheduling.algorithm !== "sm2" && scheduling.algorithm !== "leitner") {
        errors.push(`cards[${index}].scheduling.algorithm must be 'sm2' or 'leitner'`);
      }

      if (typeof scheduling.repetitions !== "number") {
        errors.push(`cards[${index}].scheduling.repetitions must be a number`);
      }

      if (typeof scheduling.intervalDays !== "number") {
        errors.push(`cards[${index}].scheduling.intervalDays must be a number`);
      }

      if (typeof scheduling.easeFactor !== "number") {
        errors.push(`cards[${index}].scheduling.easeFactor must be a number`);
      }

      if (typeof scheduling.boxIndex !== "number") {
        errors.push(`cards[${index}].scheduling.boxIndex must be a number`);
      }

      if (!isIsoDate(scheduling.dueAt)) {
        errors.push(`cards[${index}].scheduling.dueAt must be an ISO date string`);
      }

      if (scheduling.lastReviewedAt !== null && !isIsoDate(scheduling.lastReviewedAt)) {
        errors.push(`cards[${index}].scheduling.lastReviewedAt must be null or an ISO date string`);
      }

      if (typeof scheduling.lapseCount !== "number") {
        errors.push(`cards[${index}].scheduling.lapseCount must be a number`);
      }

      if (typeof scheduling.reviewCount !== "number") {
        errors.push(`cards[${index}].scheduling.reviewCount must be a number`);
      }
    }
  }

  if (Array.isArray(reviewLogs)) {
    for (let index = 0; index < reviewLogs.length; index += 1) {
      const reviewLog = reviewLogs[index];
      if (!isObject(reviewLog)) {
        errors.push(`reviewLogs[${index}] must be an object`);
        continue;
      }

      if (typeof reviewLog.id !== "string" || reviewLog.id.length === 0) {
        errors.push(`reviewLogs[${index}].id must be a non-empty string`);
      }

      if (typeof reviewLog.cardId !== "string" || !cardIds.has(reviewLog.cardId)) {
        errors.push(`reviewLogs[${index}].cardId must reference an existing card id`);
      }

      if (!isIsoDate(reviewLog.reviewedAt)) {
        errors.push(`reviewLogs[${index}].reviewedAt must be an ISO date string`);
      }

      if (![1, 2, 3, 4].includes(reviewLog.rating as number)) {
        errors.push(`reviewLogs[${index}].rating must be one of 1,2,3,4`);
      }

      if (!["rated", "no_response", "skipped"].includes(reviewLog.responseType as string)) {
        errors.push(`reviewLogs[${index}].responseType must be 'rated', 'no_response', or 'skipped'`);
      }

      if (typeof reviewLog.elapsedMs !== "number") {
        errors.push(`reviewLogs[${index}].elapsedMs must be a number`);
      }
    }
  }

  if (settings) {
    const entries = Object.entries(settings);
    for (let index = 0; index < entries.length; index += 1) {
      const [key, value] = entries[index];
      if (!key) {
        errors.push(`settings key at index ${index} must be non-empty`);
      }

      if (key === "llmApiKey") {
        errors.push("settings must not include llmApiKey");
      }

      if (typeof value !== "string") {
        errors.push(`settings.${key || "<empty>"} must be a string`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export async function importData(
  jsonData: string,
  options: ImportOptions = {},
): Promise<ImportResult> {
  const validation = validateImport(jsonData);
  if (!validation.isValid) {
    throw new Error(`Import validation failed: ${validation.errors.join("; ")}`);
  }

  const parsed = JSON.parse(jsonData) as ExportPayload;
  const includeReviewLogs = options.includeReviewLogs ?? true;
  const replaceExistingData = options.replaceExistingData ?? true;
  const db = await getDatabase();

  const importedDecks = parsed.decks;
  const importedCards = parsed.cards;
  const importedReviewLogs = includeReviewLogs ? parsed.reviewLogs ?? [] : [];
  const importedSettings = Object.entries(parsed.settings)
    .filter(([key]) => key !== "llmApiKey")
    .map(([key, value]) => ({ key, value }));

  let deckNameConflictsResolved = 0;

  try {
    await db.execute("BEGIN TRANSACTION");

    if (replaceExistingData) {
      await db.execute("DELETE FROM review_logs");
      await db.execute("DELETE FROM card_scheduling");
      await db.execute("DELETE FROM cards");
      await db.execute("DELETE FROM decks");
      await db.execute("DELETE FROM settings WHERE key != $1", ["llmApiKey"]);
    }

    const existingDeckRows = await db.select<DeckRow[]>("SELECT id, name FROM decks");
    const usedDeckIds = new Set(existingDeckRows.map((row) => row.id));
    const usedDeckNames = new Set(existingDeckRows.map((row) => row.name));
    const deckIdMap = new Map<string, string>();

    for (const deck of importedDecks) {
      const originalName = deck.name.trim() || "Imported Deck";
      const resolvedName = resolveDeckNameConflict(originalName, usedDeckNames);
      if (resolvedName !== originalName) {
        deckNameConflictsResolved += 1;
      }

      let nextDeckId = deck.id;
      if (usedDeckIds.has(nextDeckId)) {
        nextDeckId = crypto.randomUUID();
      }

      await db.execute(
        "INSERT INTO decks (id, name, description, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)",
        [nextDeckId, resolvedName, deck.description, deck.createdAt, deck.updatedAt],
      );

      usedDeckIds.add(nextDeckId);
      usedDeckNames.add(resolvedName);
      deckIdMap.set(deck.id, nextDeckId);
    }

    const existingCardIds = await db.select<{ id: string }[]>("SELECT id FROM cards");
    const existingSchedulingIds = await db.select<{ id: string }[]>("SELECT id FROM card_scheduling");
    const cardIds = new Set(existingCardIds.map((row) => row.id));
    const schedulingIds = new Set(existingSchedulingIds.map((row) => row.id));
    const cardIdMap = new Map<string, string>();

    for (const card of importedCards) {
      const nextDeckId = deckIdMap.get(card.deckId);
      if (!nextDeckId) {
        throw new Error(`Deck mapping not found for card: ${card.id}`);
      }

      let nextCardId = card.id;
      if (cardIds.has(nextCardId)) {
        nextCardId = crypto.randomUUID();
      }

      await db.execute(
        "INSERT INTO cards (id, deck_id, front, back, source, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [
          nextCardId,
          nextDeckId,
          card.front,
          card.back,
          card.source,
          card.createdAt,
          card.updatedAt,
        ],
      );

      let nextSchedulingId = card.scheduling.id;
      if (schedulingIds.has(nextSchedulingId)) {
        nextSchedulingId = crypto.randomUUID();
      }

      await db.execute(
        "INSERT INTO card_scheduling (id, card_id, algorithm, repetitions, interval_days, ease_factor, box_index, due_at, last_reviewed_at, lapse_count, review_count) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
        [
          nextSchedulingId,
          nextCardId,
          card.scheduling.algorithm,
          card.scheduling.repetitions,
          card.scheduling.intervalDays,
          card.scheduling.easeFactor,
          card.scheduling.boxIndex,
          card.scheduling.dueAt,
          card.scheduling.lastReviewedAt,
          card.scheduling.lapseCount,
          card.scheduling.reviewCount,
        ],
      );

      cardIds.add(nextCardId);
      schedulingIds.add(nextSchedulingId);
      cardIdMap.set(card.id, nextCardId);
    }

    let reviewLogsImported = 0;
    if (includeReviewLogs) {
      const existingReviewLogIds = await db.select<{ id: string }[]>("SELECT id FROM review_logs");
      const reviewLogIds = new Set(existingReviewLogIds.map((row) => row.id));

      for (const reviewLog of importedReviewLogs) {
        const nextCardId = cardIdMap.get(reviewLog.cardId);
        if (!nextCardId) {
          continue;
        }

        let nextReviewLogId = reviewLog.id;
        if (reviewLogIds.has(nextReviewLogId)) {
          nextReviewLogId = crypto.randomUUID();
        }

        await db.execute(
          "INSERT INTO review_logs (id, card_id, reviewed_at, rating, response_type, elapsed_ms) VALUES ($1, $2, $3, $4, $5, $6)",
          [
            nextReviewLogId,
            nextCardId,
            reviewLog.reviewedAt,
            reviewLog.rating,
            reviewLog.responseType,
            reviewLog.elapsedMs,
          ],
        );

        reviewLogIds.add(nextReviewLogId);
        reviewLogsImported += 1;
      }
    }

    for (const setting of importedSettings) {
      await db.execute(
        "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        [setting.key, setting.value],
      );
    }

    await db.execute("COMMIT");

    return {
      decksImported: importedDecks.length,
      cardsImported: importedCards.length,
      reviewLogsImported,
      settingsImported: importedSettings.length,
      replacedExistingData: replaceExistingData,
      deckNameConflictsResolved,
    };
  } catch (error) {
    try {
      await db.execute("ROLLBACK");
    } catch (rollbackError) {
      const rollbackMsg = rollbackError instanceof Error ? rollbackError.message : String(rollbackError);
      if (error instanceof Error) {
        error.message += ` (rollback failed: ${rollbackMsg})`;
      }
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Import failed");
  }
}

export async function exportToFile(includeReviewLogs = true): Promise<string | null> {
  const path = await invoke<string | null>("select_export_path");
  if (!path) {
    return null;
  }

  const content = await exportData(includeReviewLogs);
  await invoke("write_export_file", { path, content });
  return path;
}

export async function importFromFile(options: ImportOptions = {}): Promise<ImportResult | null> {
  const path = await invoke<string | null>("select_import_path");
  if (!path) {
    return null;
  }

  const jsonData = await invoke<string>("read_import_file", { path });
  return importData(jsonData, options);
}
