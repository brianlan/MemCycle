import type { Deck, Card, CardSchedulingState, CardSource } from "../../src/lib/types";
import { createDeck } from "../../src/lib/repositories/deckRepository";
import { createCard, getCardWithScheduling } from "../../src/lib/repositories/cardRepository";
import { getDatabase } from "../../src/lib/repositories/remoteDb";

/**
 * Type for a card with scheduling state (combined Card + CardSchedulingState)
 */
export type CardWithScheduling = Card & CardSchedulingState;

/**
 * Partial type for deck creation overrides
 */
export type DeckOverrides = Partial<Pick<Deck, "name" | "description">>;

/**
 * Partial type for card creation overrides
 */
export type CardOverrides = Partial<
  Pick<CardWithScheduling, "front" | "back" | "source">
> & {
  dueAt?: string;
};

/**
 * Creates a test deck data object with sensible defaults.
 * Does NOT insert into database - returns object for use with repositories.
 */
export function createTestDeck(overrides?: DeckOverrides): Deck {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: overrides?.name ?? "Test Deck",
    description: overrides?.description ?? "A test deck for e2e testing",
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Creates a test card data object with scheduling fields and sensible defaults.
 * Does NOT insert into database - returns object for use with repositories.
 */
export function createTestCardData(deckId: string, overrides?: CardOverrides): CardWithScheduling {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    deckId,
    front: overrides?.front ?? "Test Front",
    back: overrides?.back ?? "Test Back",
    source: overrides?.source ?? "default",
    createdAt: now,
    updatedAt: now,
    // Scheduling fields
    cardId: crypto.randomUUID(),
    algorithm: "sm2",
    repetitions: 0,
    intervalDays: 0,
    easeFactor: 2.5,
    boxIndex: 0,
    dueAt: overrides?.dueAt ?? now,
    lastReviewedAt: null,
    lapseCount: 0,
    reviewCount: 0,
  };
}

/**
 * Creates a test card and inserts it into the database.
 * Returns the created card with scheduling state.
 */
export async function createTestCard(
  deckId: string,
  overrides?: CardOverrides,
): Promise<CardWithScheduling> {
  const front = overrides?.front ?? "Test Front";
  const back = overrides?.back ?? "Test Back";
  const source: CardSource = overrides?.source ?? "default";

  const card = await createCard(deckId, front, back, source);

  // Get the card with scheduling state
  return getCardWithScheduling(card.id);
}

/**
 * Seeds the standard demo data: one deck with 2 cards.
 * Used for reproducible test scenarios.
 */
export async function seedDemoData(): Promise<{
  deck: Deck;
  cards: CardWithScheduling[];
}> {
  // Create demo deck
  const deck = await createDeck("Demo Deck", "Standard demo deck for testing");

  // Create demo cards matching final-qa.e2e.ts expectations
  const card1 = await createTestCard(deck.id, {
    front: "What is the capital of France?",
    back: "Paris",
  });

  const card2 = await createTestCard(deck.id, {
    front: "What is 2 + 2?",
    back: "4",
  });

  return {
    deck,
    cards: [card1, card2],
  };
}

/**
 * Creates a card that is immediately due for review.
 * Sets due_at to 1 second in the past to ensure it's overdue.
 */
export async function createDueCard(deckId: string): Promise<CardWithScheduling> {
  // First create a regular card
  const card = await createTestCard(deckId, {
    front: "Due Card Front",
    back: "Due Card Back",
  });

  // Update the due_at to be in the past (1 second ago)
  const db = await getDatabase();
  const pastDueAt = new Date(Date.now() - 1000).toISOString();

  await db.execute(
    "UPDATE card_scheduling SET due_at = $1 WHERE card_id = $2",
    [pastDueAt, card.id],
  );

  // Return the updated card with scheduling
  return getCardWithScheduling(card.id);
}
