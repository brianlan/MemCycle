import { test, expect } from '@playwright/test';
import { seedDemoData, createDueCard } from './infrastructure/test-fixtures';
import { getDatabase } from '../src/lib/repositories/remoteDb';

test.describe('Algorithm Switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('memcycle.settings.onboardingCompleted', 'true');
    });
    await page.goto('/');
  });

  test('should persist algorithm choice after reload', async ({ page }) => {
    test.setTimeout(60000);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible({ timeout: 10000 });
    
    await page.getByRole('button', { name: 'Algorithm' }).click();
    await page.getByText('Leitner System').click();
    
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText('Settings saved').first()).toBeVisible();
    
    await page.reload();
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('button', { name: 'Algorithm' }).click();
    
    const leitnerCard = page.getByText('Leitner System').locator('..');
    await expect(leitnerCard).toHaveClass(/border-primary/);
  });

  test('should use SM-2 scheduling when selected', async ({ page }) => {
    test.setTimeout(60000);
    await page.waitForLoadState('networkidle');

    const db = await getDatabase();
    await seedDemoData();

    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('button', { name: 'Algorithm' }).click();
    await page.getByText('SuperMemo 2 (SM-2)').click();
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText('Settings saved').first()).toBeVisible();

    const deckRows = await db.select<Array<{ id: string }>>('SELECT id FROM decks LIMIT 1');
    const deckId = deckRows[0].id;
    const card = await createDueCard(deckId);

    const schedulingRows = await db.select<Array<{ ease_factor: number; box_index: number; repetitions: number }>>(
      'SELECT ease_factor, box_index, repetitions FROM card_scheduling WHERE card_id = $1',
      [card.id]
    );
    const scheduling = schedulingRows[0];

    expect(scheduling.ease_factor).toBeGreaterThan(0);
    expect(scheduling.box_index).toBe(0);

    await page.getByRole('button', { name: 'Start Review' }).click();
    await page.keyboard.press('Space');
    await page.keyboard.press('4');

    const updatedRows = await db.select<Array<{ ease_factor: number; interval_days: number; repetitions: number }>>(
      'SELECT ease_factor, interval_days, repetitions FROM card_scheduling WHERE card_id = $1',
      [card.id]
    );
    const updated = updatedRows[0];

    expect(updated.ease_factor).toBeGreaterThan(scheduling.ease_factor);
    expect(updated.interval_days).toBeGreaterThan(0);
    expect(updated.repetitions).toBeGreaterThan(scheduling.repetitions);
  });

  test('should use Leitner boxes when selected', async ({ page }) => {
    test.setTimeout(60000);
    await page.waitForLoadState('networkidle');

    const db = await getDatabase();
    await seedDemoData();

    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('button', { name: 'Algorithm' }).click();
    await page.getByText('Leitner System').click();
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText('Settings saved').first()).toBeVisible();

    const deckRows = await db.select<Array<{ id: string }>>('SELECT id FROM decks LIMIT 1');
    const deckId = deckRows[0].id;
    const card = await createDueCard(deckId);

    const schedulingRows = await db.select<Array<{ box_index: number }>>(
      'SELECT box_index FROM card_scheduling WHERE card_id = $1',
      [card.id]
    );
    const scheduling = schedulingRows[0];

    expect(scheduling.box_index).toBe(0);

    await page.getByRole('button', { name: 'Start Review' }).click();
    await page.keyboard.press('Space');
    await page.keyboard.press('3');

    const updatedRows = await db.select<Array<{ box_index: number; interval_days: number }>>(
      'SELECT box_index, interval_days FROM card_scheduling WHERE card_id = $1',
      [card.id]
    );
    const updated = updatedRows[0];

    expect(updated.box_index).toBe(1);
    expect(updated.interval_days).toBe(3);
  });

  test('should switch algorithms and recalculate due dates', async ({ page }) => {
    test.setTimeout(60000);
    await page.waitForLoadState('networkidle');

    const db = await getDatabase();
    await seedDemoData();

    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('button', { name: 'Algorithm' }).click();
    await page.getByText('SuperMemo 2 (SM-2)').click();
    await page.getByRole('button', { name: 'Save Changes' }).click();

    const deckRows = await db.select<Array<{ id: string }>>('SELECT id FROM decks LIMIT 1');
    const deckId = deckRows[0].id;
    const card1 = await createDueCard(deckId);
    const card2 = await createDueCard(deckId);

    await page.getByRole('button', { name: 'Start Review' }).click();
    await page.keyboard.press('Space');
    await page.keyboard.press('4');
    await page.keyboard.press('Space');
    await page.keyboard.press('4');

    const sm2Rows = await db.select<Array<{ id: string; due_at: string; ease_factor: number; box_index: number }>>(
      'SELECT id, due_at, ease_factor, box_index FROM card_scheduling WHERE card_id IN ($1, $2)',
      [card1.id, card2.id]
    );
    const sm2DueDates = sm2Rows.map((row) => row.due_at);

    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('button', { name: 'Algorithm' }).click();
    await page.getByText('Leitner System').click();
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText('Settings saved').first()).toBeVisible();

    const leitnerRows = await db.select<Array<{ id: string; due_at: string; ease_factor: number; box_index: number }>>(
      'SELECT id, due_at, ease_factor, box_index FROM card_scheduling WHERE card_id IN ($1, $2)',
      [card1.id, card2.id]
    );
    const leitnerDueDates = leitnerRows.map((row) => row.due_at);

    expect(leitnerDueDates[0]).not.toBe(sm2DueDates[0]);
    expect(leitnerDueDates[1]).not.toBe(sm2DueDates[1]);

    expect(leitnerRows[0].box_index).toBe(0);
    expect(leitnerRows[1].box_index).toBe(0);
  });

  test('should test both algorithms via full review flow', async ({ page }) => {
    test.setTimeout(60000);
    await page.waitForLoadState('networkidle');

    const db = await getDatabase();
    const { deck, cards } = await seedDemoData();

    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('button', { name: 'Algorithm' }).click();
    await page.getByText('SuperMemo 2 (SM-2)').click();
    await page.getByRole('button', { name: 'Save Changes' }).click();

    for (const card of cards) {
      await db.execute(
        'UPDATE card_scheduling SET due_at = $1 WHERE card_id = $2',
        [new Date(Date.now() - 1000).toISOString(), card.id]
      );
    }

    await page.getByRole('button', { name: 'Start Review' }).click();
    await expect(page.locator('text=Card 1 of 2')).toBeVisible();
    await page.keyboard.press('Space');
    await page.keyboard.press('3');
    await expect(page.locator('text=Card 2 of 2')).toBeVisible();
    await page.keyboard.press('Space');
    await page.keyboard.press('4');

    const sm2Rows = await db.select<Array<{ algorithm: string; ease_factor: number; interval_days: number; repetitions: number }>>(
      'SELECT algorithm, ease_factor, interval_days, repetitions FROM card_scheduling WHERE deck_id = $1',
      [deck.id]
    );
    for (const row of sm2Rows) {
      expect(row.algorithm).toBe('sm2');
      expect(row.ease_factor).toBeGreaterThan(0);
      expect(row.interval_days).toBeGreaterThan(0);
      expect(row.repetitions).toBeGreaterThan(0);
    }

    for (const card of cards) {
      await db.execute(
        'UPDATE card_scheduling SET due_at = $1 WHERE card_id = $2',
        [new Date(Date.now() - 1000).toISOString(), card.id]
      );
    }

    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('button', { name: 'Algorithm' }).click();
    await page.getByText('Leitner System').click();
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await page.getByRole('button', { name: 'Start Review' }).click();
    await expect(page.locator('text=Card 1 of 2')).toBeVisible();
    await page.keyboard.press('Space');
    await page.keyboard.press('3');
    await expect(page.locator('text=Card 2 of 2')).toBeVisible();
    await page.keyboard.press('Space');
    await page.keyboard.press('2');

    const leitnerRows = await db.select<Array<{ algorithm: string; box_index: number }>>(
      'SELECT algorithm, box_index FROM card_scheduling WHERE deck_id = $1',
      [deck.id]
    );
    expect(leitnerRows[0].box_index).toBe(1);
    expect(leitnerRows[1].box_index).toBe(0);
    for (const row of leitnerRows) {
      expect(row.algorithm).toBe('leitner');
    }
  });
});
