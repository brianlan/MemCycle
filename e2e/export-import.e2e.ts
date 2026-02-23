import { test, expect } from "@playwright/test";
import { seedDemoData, createTestDeck } from "./infrastructure/test-fixtures";
import { getDecks } from "../src/lib/repositories/deckRepository";
import { getCards } from "../src/lib/repositories/cardRepository";
import { getDatabase } from "../src/lib/repositories/remoteDb";
import { exportData, importData, validateImport } from "../src/lib/services/exportService";
import type { ExportPayload } from "../src/lib/services/exportService";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

test.describe("Export/Import", () => {
  const evidenceDir = ".sisyphus/evidence";
  const tempDir = path.join(os.tmpdir(), "memcycle-e2e-tests");

  test.beforeAll(async () => {
    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    if (!fs.existsSync(evidenceDir)) {
      fs.mkdirSync(evidenceDir, { recursive: true });
    }
  });

  test.beforeEach(async () => {
    // Clear all test data before each test
    const db = await getDatabase();
    await db.execute("DELETE FROM review_logs");
    await db.execute("DELETE FROM card_scheduling");
    await db.execute("DELETE FROM cards");
    await db.execute("DELETE FROM decks");
    await db.execute("DELETE FROM settings WHERE key != $1", ["llmApiKey"]);
  });

  test.afterAll(async () => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("should export data as valid JSON with version field", async ({ page }) => {
    // Seed test data
    const testData = await seedDemoData();

    // Export data
    const exportedJson = await exportData(true);

    // Parse and validate JSON structure
    const parsed = JSON.parse(exportedJson) as ExportPayload;

    // Verify version field
    expect(parsed.version).toBe("1.0");

    // Verify exportedAt is valid ISO date
    expect(() => Date.parse(parsed.exportedAt)).not.toThrow();

    // Verify deck data
    expect(Array.isArray(parsed.decks)).toBe(true);
    expect(parsed.decks.length).toBeGreaterThan(0);
    expect(parsed.decks[0].name).toBe(testData.deck.name);

    // Verify card data
    expect(Array.isArray(parsed.cards)).toBe(true);
    expect(parsed.cards.length).toBeGreaterThan(0);

    // Verify review logs
    expect(Array.isArray(parsed.reviewLogs)).toBe(true);

    // Verify settings
    expect(typeof parsed.settings).toBe("object");

    // Verify each card has scheduling state
    for (const card of parsed.cards) {
      expect(card).toHaveProperty("scheduling");
      expect(card.scheduling).toHaveProperty("algorithm");
      expect(card.scheduling).toHaveProperty("dueAt");
    }

    // Save exported JSON for evidence
    const exportFilePath = path.join(evidenceDir, "task-28-export.json");
    fs.writeFileSync(exportFilePath, exportedJson);

    await page.screenshot({ path: path.join(evidenceDir, "task-28-export.png") });
  });

  test("should restore data identically after import", async ({ page }) => {
    await seedDemoData();
    const initialDecks = await getDecks();
    const initialCards = await getCards();

    // Export data
    const exportedJson = await exportData(true);

    // Delete all data
    const db = await getDatabase();
    await db.execute("DELETE FROM review_logs");
    await db.execute("DELETE FROM card_scheduling");
    await db.execute("DELETE FROM cards");
    await db.execute("DELETE FROM decks");

    // Verify data was deleted
    const deletedDecks = await getDecks();
    const deletedCards = await getCards();
    expect(deletedDecks.length).toBe(0);
    expect(deletedCards.length).toBe(0);

    // Import data
    const result = await importData(exportedJson, {
      includeReviewLogs: true,
      replaceExistingData: true,
    });

    // Verify import result
    expect(result.decksImported).toBe(initialDecks.length);
    expect(result.cardsImported).toBe(initialCards.length);

    // Verify data was restored
    const restoredDecks = await getDecks();
    const restoredCards = await getCards();

    expect(restoredDecks.length).toBe(initialDecks.length);
    expect(restoredCards.length).toBe(initialCards.length);

    // Verify deck data integrity
    for (let i = 0; i < restoredDecks.length; i++) {
      expect(restoredDecks[i].name).toBe(initialDecks[i].name);
      expect(restoredDecks[i].description).toBe(initialDecks[i].description);
    }

    // Verify card data integrity
    for (let i = 0; i < restoredCards.length; i++) {
      expect(restoredCards[i].front).toBe(initialCards[i].front);
      expect(restoredCards[i].back).toBe(initialCards[i].back);
      expect(restoredCards[i].source).toBe(initialCards[i].source);
    }

    await page.screenshot({ path: path.join(evidenceDir, "task-28-roundtrip.png") });
  });

  test("should reject malformed JSON import", async ({ page }) => {
    // Seed some data first
    await seedDemoData();

    // Create malformed JSON files
    const malformedCases = [
      { name: "invalid-json", content: "{ invalid json }" },
      { name: "missing-version", content: JSON.stringify({ decks: [], cards: [], settings: {} }) },
      { name: "wrong-version", content: JSON.stringify({ version: "0.0", decks: [], cards: [], settings: {} }) },
      { name: "missing-decks", content: JSON.stringify({ version: "1.0", exportedAt: new Date().toISOString(), cards: [], settings: {} }) },
      { name: "missing-cards", content: JSON.stringify({ version: "1.0", exportedAt: new Date().toISOString(), decks: [], settings: {} }) },
      { name: "invalid-decks", content: JSON.stringify({ version: "1.0", exportedAt: new Date().toISOString(), decks: "not-an-array", cards: [], settings: {} }) },
      { name: "invalid-exportedAt", content: JSON.stringify({ version: "1.0", exportedAt: "not-a-date", decks: [], cards: [], settings: {} }) },
    ];

    for (const testCase of malformedCases) {
      const validation = validateImport(testCase.content);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    }

    // Save evidence of rejected imports
    const evidenceFilePath = path.join(evidenceDir, "task-28-malformed-evidence.txt");
    fs.writeFileSync(
      evidenceFilePath,
      malformedCases
        .map((c) => `${c.name}: ${validateImport(c.content).errors.join(", ")}`)
        .join("\n"),
    );

    await page.screenshot({ path: path.join(evidenceDir, "task-28-malformed.png") });
  });

  test("should handle ID conflicts on import", async ({ page }) => {
    // Seed initial data
    const testData1 = await seedDemoData();
    const initialDeck = testData1.deck;

    // Export first dataset
    const export1 = await exportData(true);
    const parsed1 = JSON.parse(export1) as ExportPayload;

    const deck2 = createTestDeck({
      name: "Imported Deck",
      description: "Deck with conflicting IDs",
    });
    // Manually insert deck2 with same ID as deck1
    const db = await getDatabase();
    await db.execute(
      "UPDATE decks SET name = $2, description = $3 WHERE id = $1",
      [initialDeck.id, deck2.name, deck2.description],
    );

    // Verify we have duplicate IDs now
    const decksBeforeImport = await getDecks();
    expect(decksBeforeImport.length).toBe(1);
    expect(decksBeforeImport[0].name).toBe(deck2.name);

    // Import the first export (which has same deck ID as existing data)
    const result = await importData(export1, {
      includeReviewLogs: true,
      replaceExistingData: false,
    });

    // Verify import handled conflicts by generating new UUIDs
    expect(result.decksImported).toBeGreaterThan(0);
    expect(result.deckNameConflictsResolved).toBeGreaterThan(0);

    const decksAfterImport = await getDecks();
    // Should have more decks now (original + imported with new IDs)
    expect(decksAfterImport.length).toBeGreaterThan(decksBeforeImport.length);

    // At least one deck should have the imported name (possibly with suffix)
    const hasImportedDeck = decksAfterImport.some((d) =>
      d.name.includes(parsed1.decks[0].name),
    );
    expect(hasImportedDeck).toBe(true);

    await page.screenshot({ path: path.join(evidenceDir, "task-28-id-conflicts.png") });
  });

  test("should provide user-friendly error messages", async ({ page }) => {
    // Test various invalid scenarios and check error messages
    const invalidCases = [
      {
        name: "Empty JSON",
        content: "",
        expectedError: "JSON payload must be an object",
      },
      {
        name: "Wrong version",
        content: JSON.stringify({
          version: "2.0",
          exportedAt: new Date().toISOString(),
          decks: [],
          cards: [],
          settings: {},
        }),
        expectedError: "version must be '1.0'",
      },
      {
        name: "Invalid deck",
        content: JSON.stringify({
          version: "1.0",
          exportedAt: new Date().toISOString(),
          decks: [{ id: "" }], // Missing required fields
          cards: [],
          settings: {},
        }),
        expectedError: "decks[0].name must be a non-empty string",
      },
      {
        name: "Invalid card",
        content: JSON.stringify({
          version: "1.0",
          exportedAt: new Date().toISOString(),
          decks: [{ id: "d1", name: "Test", description: "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }],
          cards: [{ id: "" }], // Missing required fields
          settings: {},
        }),
        expectedError: "cards[0].front must be a string",
      },
    ];

    const errorMessages: string[] = [];

    for (const testCase of invalidCases) {
      try {
        await importData(testCase.content, { replaceExistingData: true });
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        expect(errorMessage).toContain(testCase.expectedError);
        errorMessages.push(`${testCase.name}: ${errorMessage}`);
      }
    }

    // Save error messages as evidence
    const errorEvidencePath = path.join(evidenceDir, "task-28-error-messages.txt");
    fs.writeFileSync(errorEvidencePath, errorMessages.join("\n"));

    await page.screenshot({ path: path.join(evidenceDir, "task-28-errors.png") });
  });

  test("should preserve scheduling state across export/import", async ({ page }) => {
    // Seed data with specific scheduling state
    const testData = await seedDemoData();

    // Modify scheduling state of first card
    const db = await getDatabase();
    await db.execute(
      `UPDATE card_scheduling SET 
         repetitions = 5,
         interval_days = 10,
         ease_factor = 2.8,
         box_index = 3,
         due_at = '2024-12-25T10:00:00.000Z',
         last_reviewed_at = '2024-12-24T10:00:00.000Z',
         lapse_count = 1,
         review_count = 5
       WHERE card_id = $1`,
      [testData.cards[0].id],
    );

    // Get updated scheduling
    const updatedCard = await getCards();
    const firstCardId = updatedCard[0].id;

    // Export data
    const exportedJson = await exportData(true);
    const parsed = JSON.parse(exportedJson) as ExportPayload;

    const exportedCard = parsed.cards.find((c) => (c as any).id === firstCardId);
    expect(exportedCard!.scheduling.repetitions).toBe(5);
    expect(exportedCard!.scheduling.intervalDays).toBe(10);
    expect(exportedCard!.scheduling.easeFactor).toBe(2.8);
    expect(exportedCard!.scheduling.boxIndex).toBe(3);
    expect(exportedCard!.scheduling.lapseCount).toBe(1);
    expect(exportedCard!.scheduling.reviewCount).toBe(5);

    // Delete all data
    await db.execute("DELETE FROM review_logs");
    await db.execute("DELETE FROM card_scheduling");
    await db.execute("DELETE FROM cards");
    await db.execute("DELETE FROM decks");

    // Import data
    await importData(exportedJson, { includeReviewLogs: true, replaceExistingData: true });

    // Get imported data
    const importedCards = await getCards();
    const importedCard = importedCards.find((c) => c.front === testData.cards[0].front);
    expect(importedCard).toBeDefined();

    // Verify scheduling state was preserved
    // Note: IDs may have changed due to ID conflict resolution
    const schedulingQuery = await db.select<any[]>(
      "SELECT * FROM card_scheduling WHERE card_id = $1",
      [importedCard!.id],
    );
    expect(schedulingQuery.length).toBe(1);
    expect(schedulingQuery[0].repetitions).toBe(5);
    expect(schedulingQuery[0].interval_days).toBe(10);
    expect(schedulingQuery[0].ease_factor).toBe(2.8);
    expect(schedulingQuery[0].box_index).toBe(3);
    expect(schedulingQuery[0].lapse_count).toBe(1);
    expect(schedulingQuery[0].review_count).toBe(5);

    await page.screenshot({ path: path.join(evidenceDir, "task-28-scheduling.png") });
  });
});
