import { getDatabase } from "@/lib/repositories/remoteDb";
import type { Deck } from "@/lib/types";

type DeckUpdates = Partial<Pick<Deck, "name" | "description">>;

interface DeckRow {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
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

  if (message.includes("UNIQUE constraint failed") && message.includes("decks.name")) {
    throw new Error("A deck with this name already exists");
  }

  if (message.includes("NOT NULL constraint failed") && message.includes("decks.name")) {
    throw new Error("Deck name is required");
  }

  throw new Error(`Deck repository error: ${message}`);
}

async function getDeckRow(id: string): Promise<DeckRow | null> {
  const db = await getDatabase();
  const rows = await db.select<DeckRow[]>(
    "SELECT id, name, description, created_at, updated_at FROM decks WHERE id = $1 LIMIT 1",
    [id],
  );

  return rows[0] ?? null;
}

export async function createDeck(name: string, description = ""): Promise<Deck> {
  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("Deck name is required");
  }

  const db = await getDatabase();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    await db.execute(
      "INSERT INTO decks (id, name, description, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)",
      [id, trimmedName, description, now, now],
    );

    const created = await getDeckRow(id);
    if (!created) {
      throw new Error("Failed to create deck");
    }

    return mapDeckRow(created);
  } catch (error) {
    mapDatabaseError(error);
  }
}

export async function getDecks(): Promise<Deck[]> {
  const db = await getDatabase();

  try {
    const rows = await db.select<DeckRow[]>(
      "SELECT id, name, description, created_at, updated_at FROM decks ORDER BY created_at DESC",
    );

    return rows.map(mapDeckRow);
  } catch (error) {
    mapDatabaseError(error);
  }
}

export async function getDeck(id: string): Promise<Deck | null> {
  try {
    const row = await getDeckRow(id);
    return row ? mapDeckRow(row) : null;
  } catch (error) {
    mapDatabaseError(error);
  }
}

export async function updateDeck(id: string, updates: DeckUpdates): Promise<Deck> {
  const existing = await getDeckRow(id);

  if (!existing) {
    throw new Error(`Deck not found: ${id}`);
  }

  const nextName =
    updates.name === undefined ? existing.name : updates.name.trim();

  if (!nextName) {
    throw new Error("Deck name is required");
  }

  const nextDescription = updates.description ?? existing.description ?? "";
  const now = new Date().toISOString();
  const db = await getDatabase();

  try {
    await db.execute(
      "UPDATE decks SET name = $1, description = $2, updated_at = $3 WHERE id = $4",
      [nextName, nextDescription, now, id],
    );

    const updated = await getDeckRow(id);
    if (!updated) {
      throw new Error(`Deck not found: ${id}`);
    }

    return mapDeckRow(updated);
  } catch (error) {
    mapDatabaseError(error);
  }
}

export async function deleteDeck(id: string): Promise<void> {
  const db = await getDatabase();

  try {
    const result = await db.execute("DELETE FROM decks WHERE id = $1", [id]);

    if (result.rowsAffected === 0) {
      throw new Error(`Deck not found: ${id}`);
    }
  } catch (error) {
    mapDatabaseError(error);
  }
}
