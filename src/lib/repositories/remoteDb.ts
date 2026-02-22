import Database from "@tauri-apps/plugin-sql";

const LOCAL_DB_URL = "sqlite:app.db";

type DatabaseMode = "local" | "remote";

let databaseMode: DatabaseMode = "local";
let remoteDbUrl: string | null = null;
let dbPromise: Promise<Database> | null = null;
let loadedDbUrl: string | null = null;

const PG_MIGRATION_STATEMENTS: readonly string[] = [
  "CREATE TABLE IF NOT EXISTS decks (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, description TEXT DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL)",
  "CREATE TABLE IF NOT EXISTS cards (id TEXT PRIMARY KEY NOT NULL, deck_id TEXT NOT NULL, front TEXT NOT NULL, back TEXT NOT NULL, source TEXT DEFAULT 'default', created_at TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE)",
  "CREATE TABLE IF NOT EXISTS card_scheduling (id TEXT PRIMARY KEY NOT NULL, card_id TEXT NOT NULL UNIQUE, algorithm TEXT DEFAULT 'sm2', repetitions INTEGER DEFAULT 0, interval_days INTEGER DEFAULT 0, ease_factor DOUBLE PRECISION DEFAULT 2.5, box_index INTEGER DEFAULT 0, due_at TEXT NOT NULL, last_reviewed_at TEXT, lapse_count INTEGER DEFAULT 0, review_count INTEGER DEFAULT 0, FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE)",
  "CREATE TABLE IF NOT EXISTS review_logs (id TEXT PRIMARY KEY NOT NULL, card_id TEXT NOT NULL, reviewed_at TEXT NOT NULL, rating INTEGER NOT NULL, response_type TEXT NOT NULL, elapsed_ms INTEGER NOT NULL, FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE)",
  "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)",
  "CREATE INDEX IF NOT EXISTS idx_cards_deck_id ON cards(deck_id)",
  "CREATE INDEX IF NOT EXISTS idx_card_scheduling_card_id ON card_scheduling(card_id)",
  "CREATE INDEX IF NOT EXISTS idx_card_scheduling_due_at ON card_scheduling(due_at)",
  "CREATE INDEX IF NOT EXISTS idx_review_logs_card_id ON review_logs(card_id)",
  "CREATE INDEX IF NOT EXISTS idx_review_logs_reviewed_at ON review_logs(reviewed_at)",
];

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown database error";
}

function resetLoadedDatabase(): void {
  dbPromise = null;
  loadedDbUrl = null;
}

function getRemoteUrlOrThrow(): string {
  if (!remoteDbUrl) {
    throw new Error("Remote database is not configured");
  }

  return remoteDbUrl;
}

function getCurrentDbUrl(): string {
  return databaseMode === "remote" ? getRemoteUrlOrThrow() : LOCAL_DB_URL;
}

async function configureDatabase(url: string, db: Database): Promise<void> {
  if (url.startsWith("sqlite:")) {
    await db.execute("PRAGMA foreign_keys = ON");
    return;
  }

  for (const statement of PG_MIGRATION_STATEMENTS) {
    await db.execute(statement);
  }
}

async function loadDatabase(url: string): Promise<Database> {
  const db = await Database.load(url);
  await configureDatabase(url, db);
  return db;
}

export async function connectRemote(
  host: string,
  port: number,
  database: string,
  user: string,
  password: string,
): Promise<void> {
  const nextHost = host.trim();
  const nextDatabase = database.trim();
  const nextUser = user.trim();

  if (!nextHost || !nextDatabase || !nextUser) {
    throw new Error("Remote database host, database, and user are required");
  }

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error("Remote database port must be between 1 and 65535");
  }

  const encodedUser = encodeURIComponent(nextUser);
  const encodedPassword = encodeURIComponent(password);
  const encodedDatabase = encodeURIComponent(nextDatabase);

  remoteDbUrl = `postgres://${encodedUser}:${encodedPassword}@${nextHost}:${port}/${encodedDatabase}`;

  if (databaseMode === "remote") {
    resetLoadedDatabase();
  }
}

export async function testConnection(): Promise<boolean> {
  if (!remoteDbUrl) {
    return false;
  }

  try {
    const db = await loadDatabase(remoteDbUrl);
    await db.select<{ value: number }[]>("SELECT 1 AS value");
    return true;
  } catch {
    return false;
  }
}

export function switchToRemote(): void {
  getRemoteUrlOrThrow();
  databaseMode = "remote";
  resetLoadedDatabase();
}

export function switchToLocal(): void {
  databaseMode = "local";
  resetLoadedDatabase();
}

export function getDatabaseMode(): DatabaseMode {
  return databaseMode;
}

export function getDatabaseUrl(): string {
  return getCurrentDbUrl();
}

export function getRemoteDatabaseUrlForDebug(): string | null {
  return remoteDbUrl;
}

export async function getDatabase(): Promise<Database> {
  const url = getCurrentDbUrl();

  if (!dbPromise || loadedDbUrl !== url) {
    loadedDbUrl = url;
    dbPromise = loadDatabase(url).catch((error) => {
      resetLoadedDatabase();
      throw new Error(`Database load failed: ${toErrorMessage(error)}`);
    });
  }

  return dbPromise;
}
