import { getDatabase } from "../../src/lib/repositories/remoteDb";

const TEST_DB_PATH = "./test.db";

export function getTestDatabasePath(): string {
  return TEST_DB_PATH;
}

export async function resetDatabase(): Promise<void> {
  const db = await getDatabase();

  await db.execute("DELETE FROM cards");
  await db.execute("DELETE FROM decks");
  await db.execute("DELETE FROM review_logs");
  await db.execute("DELETE FROM settings");
}
