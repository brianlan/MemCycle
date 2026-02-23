import { test, expect, type Page } from '@playwright/test';
import { seedDemoData, createDueCard } from './infrastructure/test-fixtures';
import { resetDatabase } from './infrastructure/db-isolation';
import { getDatabase } from '../src/lib/repositories/remoteDb';
import { calculateNextReview as calculateSm2NextReview } from '../src/lib/algorithms/sm2';
import { calculateNextReview as calculateLeitnerNextReview } from '../src/lib/algorithms/leitner';
import type { CardSchedulingState, Rating } from '../src/lib/types';

type SchedulingRow = {
  repetitions: number;
  interval_days: number;
  ease_factor: number;
  box_index: number;
  due_at: string;
  last_reviewed_at: string | null;
  lapse_count: number;
  review_count: number;
};

const ratingCases: Array<{ label: string; value: Rating }> = [
  { label: 'Again', value: 1 },
  { label: 'Hard', value: 2 },
  { label: 'Good', value: 3 },
  { label: 'Easy', value: 4 },
];

async function setAlgorithmSetting(algorithm: 'sm2' | 'leitner'): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    ['selectedAlgorithm', algorithm],
  );
  await db.execute(
    'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    ['algorithm', algorithm],
  );
}

async function getScheduling(cardId: string): Promise<SchedulingRow> {
  const db = await getDatabase();
  const rows = await db.select<Array<SchedulingRow>>(
    'SELECT repetitions, interval_days, ease_factor, box_index, due_at, last_reviewed_at, lapse_count, review_count FROM card_scheduling WHERE card_id = $1',
    [cardId],
  );
  return rows[0];
}

function toSchedulingState(cardId: string, row: SchedulingRow, algorithm: 'sm2' | 'leitner'): CardSchedulingState {
  return {
    id: cardId,
    cardId,
    algorithm,
    repetitions: row.repetitions,
    intervalDays: row.interval_days,
    easeFactor: row.ease_factor,
    boxIndex: row.box_index,
    dueAt: row.due_at,
    lastReviewedAt: row.last_reviewed_at,
    lapseCount: row.lapse_count,
    reviewCount: row.review_count,
  };
}

async function closeReviewIfNeeded(page: Page): Promise<void> {
  const noCards = page.getByText('No cards due!');
  if (await noCards.isVisible()) {
    await page.getByRole('button', { name: 'Close' }).click();
  }
  await expect(page.getByRole('button', { name: 'Start Review' })).toBeVisible();
}

test.describe('Card Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabase();
    await page.addInitScript(() => {
      localStorage.setItem('memcycle.settings.onboardingCompleted', 'true');
    });
    await page.goto('/');
  });
  
  test('should update schedule after rating', async ({ page }) => {
    test.setTimeout(60000);
    await page.waitForLoadState('networkidle');

    const db = await getDatabase();
    const { deck, cards } = await seedDemoData();
    const futureDueAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    for (const card of cards) {
      await db.execute('UPDATE card_scheduling SET due_at = $1 WHERE card_id = $2', [futureDueAt, card.id]);
    }

    await setAlgorithmSetting('sm2');
    for (const rating of ratingCases) {
      const card = await createDueCard(deck.id);
      const before = await getScheduling(card.id);
      const expected = calculateSm2NextReview(
        toSchedulingState(card.id, before, 'sm2'),
        rating.value,
        new Date(),
      );

      await page.getByRole('button', { name: 'Start Review' }).click();
      await page.getByRole('button', { name: /Show Answer/i }).click();
      await page.getByRole('button', { name: rating.label }).click();
      await closeReviewIfNeeded(page);

      const after = await getScheduling(card.id);

      if (rating.value === 1) {
        expect(after.repetitions).toBe(0);
      } else {
        expect(after.repetitions).toBeGreaterThan(before.repetitions);
      }

      if (rating.value === 3) {
        expect(after.ease_factor).toBeCloseTo(before.ease_factor, 5);
      } else {
        expect(after.ease_factor).not.toBe(before.ease_factor);
      }

      expect(after.repetitions).toBe(expected.repetitions);
      expect(after.interval_days).toBe(expected.intervalDays);
      expect(after.ease_factor).toBeCloseTo(expected.easeFactor, 5);
      expect(new Date(after.due_at).getTime()).toBeGreaterThan(new Date(before.due_at).getTime());
    }

    await setAlgorithmSetting('leitner');
    for (const rating of ratingCases) {
      const card = await createDueCard(deck.id);
      const before = await getScheduling(card.id);
      const expected = calculateLeitnerNextReview(
        toSchedulingState(card.id, before, 'leitner'),
        rating.value >= 3,
        new Date(),
      );

      await page.getByRole('button', { name: 'Start Review' }).click();
      await page.getByRole('button', { name: /Show Answer/i }).click();
      await page.getByRole('button', { name: rating.label }).click();
      await closeReviewIfNeeded(page);

      const after = await getScheduling(card.id);

      if (rating.value >= 3) {
        expect(after.box_index).toBeGreaterThan(before.box_index);
      } else {
        expect(after.box_index).toBe(0);
      }

      expect(after.box_index).toBe(expected.boxIndex);
      expect(after.interval_days).toBe(expected.intervalDays);
      expect(new Date(after.due_at).getTime()).toBeGreaterThan(new Date(before.due_at).getTime());
    }
  });
});
