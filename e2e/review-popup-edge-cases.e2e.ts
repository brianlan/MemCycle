import { test, expect } from '@playwright/test';
import { seedDemoData } from './infrastructure/test-fixtures';
import { resetDatabase } from './infrastructure/db-isolation';
import { waitForTextContent } from './infrastructure/wait-helpers';
import { getDatabase } from '../src/lib/repositories/remoteDb';

async function setDueAt(cardIds: string[], dueAt: string): Promise<void> {
  const db = await getDatabase();
  for (const cardId of cardIds) {
    await db.execute('UPDATE card_scheduling SET due_at = $1 WHERE card_id = $2', [dueAt, cardId]);
  }
}

test.describe('Review Popup Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabase();
    await page.addInitScript(() => {
      localStorage.setItem('memcycle.settings.onboardingCompleted', 'true');
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('rapid rating clicks only register once', async ({ page }) => {
    const { cards } = await seedDemoData();
    const pastDueAt = new Date(Date.now() - 1000).toISOString();
    await setDueAt(cards.map((card) => card.id), pastDueAt);

    const startReview = page.getByRole('button', { name: 'Start Review' });
    await expect(startReview).toBeVisible();
    await startReview.click();

    await expect(page.getByText('Card 1 of 2')).toBeVisible();
    await page.getByRole('button', { name: /Show Answer/i }).click();
    await expect(page.getByRole('heading', { name: 'Back', level: 3 })).toBeVisible();

    const goodButton = page.getByRole('button', { name: 'Good' });
    await expect(goodButton).toBeVisible();
    await goodButton.dblclick();

    await expect(page.getByText('Card 2 of 2')).toBeVisible();
    await expect(page.getByText('No cards due!')).not.toBeVisible();
  });

  test('empty due queue shows celebration state', async ({ page }) => {
    const { cards } = await seedDemoData();
    const futureDueAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await setDueAt(cards.map((card) => card.id), futureDueAt);

    const startReview = page.getByRole('button', { name: 'Start Review' });
    await expect(startReview).toBeVisible();
    await startReview.click();

    await expect(page.getByText('No cards due!')).toBeVisible();
    await expect(page.getByText("You're all caught up for now.")).toBeVisible();
    await expect(page.getByText('Card 1 of 1')).not.toBeVisible();
  });

  test('single card shows 1 of 1 and completes to celebration', async ({ page }) => {
    const { cards } = await seedDemoData();
    const pastDueAt = new Date(Date.now() - 1000).toISOString();
    const futureDueAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await setDueAt([cards[0].id], pastDueAt);
    await setDueAt([cards[1].id], futureDueAt);

    const startReview = page.getByRole('button', { name: 'Start Review' });
    await expect(startReview).toBeVisible();
    await startReview.click();

    await expect(page.getByText('Card 1 of 1')).toBeVisible();
    await page.getByRole('button', { name: /Show Answer/i }).click();
    await expect(page.getByRole('button', { name: 'Good' })).toBeVisible();
    await page.getByRole('button', { name: 'Good' }).click();

    await expect(page.getByText('No cards due!')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();
  });

  test('keyboard shortcuts are disabled after final rating', async ({ page }) => {
    const { cards } = await seedDemoData();
    const pastDueAt = new Date(Date.now() - 1000).toISOString();
    const futureDueAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await setDueAt([cards[0].id], pastDueAt);
    await setDueAt([cards[1].id], futureDueAt);

    const startReview = page.getByRole('button', { name: 'Start Review' });
    await expect(startReview).toBeVisible();
    await startReview.click();

    await expect(page.getByText('Card 1 of 1')).toBeVisible();
    await page.getByRole('button', { name: /Show Answer/i }).click();
    await page.getByRole('button', { name: 'Good' }).click();
    await expect(page.getByText('No cards due!')).toBeVisible();

    await page.keyboard.press('1');
    await page.keyboard.press('Space');

    await expect(page.getByText('No cards due!')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();
  });

  test('reveal state resets when moving to next card', async ({ page }) => {
    const { cards } = await seedDemoData();
    const pastDueAt = new Date(Date.now() - 1000).toISOString();
    await setDueAt(cards.map((card) => card.id), pastDueAt);

    const startReview = page.getByRole('button', { name: 'Start Review' });
    await expect(startReview).toBeVisible();
    await startReview.click();

    await expect(page.getByText('Card 1 of 2')).toBeVisible();
    await page.getByRole('button', { name: /Show Answer/i }).click();
    await expect(page.getByRole('heading', { name: 'Back', level: 3 })).toBeVisible();
    await page.getByRole('button', { name: 'Good' }).click();

    await expect(page.getByText('Card 2 of 2')).toBeVisible();
    await expect(page.getByRole('button', { name: /Show Answer/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Back', level: 3 })).not.toBeVisible();
  });

  test('countdown timer resets on each new card', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-01-01T00:00:00.000Z') });
    const { cards } = await seedDemoData();
    const pastDueAt = new Date(Date.now() - 1000).toISOString();
    await setDueAt(cards.map((card) => card.id), pastDueAt);

    const startReview = page.getByRole('button', { name: 'Start Review' });
    await expect(startReview).toBeVisible();
    await startReview.click();

    const countdown = page.locator('.font-mono').filter({ hasText: /^\d+s$/ });
    await waitForTextContent(countdown, '30s');

    await page.clock.fastForward(5000);
    await waitForTextContent(countdown, '25s');

    await page.getByRole('button', { name: /Show Answer/i }).click();
    await page.getByRole('button', { name: 'Good' }).click();

    await expect(page.getByText('Card 2 of 2')).toBeVisible();
    await waitForTextContent(countdown, '30s');
  });

});
