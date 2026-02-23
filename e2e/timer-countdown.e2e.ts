import { test, expect } from '@playwright/test';

import {
  waitForElementReady,
  waitForTextContent,
} from './infrastructure/wait-helpers';

test.describe('timer countdown', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: new Date('2026-01-01T00:00:00.000Z') });
    await page.addInitScript(() => {
      localStorage.setItem('memcycle.settings.onboardingCompleted', 'true');
    });
    await page.goto('/');
  });

  test('should decrement countdown every second', async ({ page }) => {
    const startReview = page.getByRole('button', { name: 'Start Review' });
    await waitForElementReady(startReview);
    await startReview.click();

    const countdown = page.locator('.font-mono').filter({ hasText: /^\d+s$/ });
    await waitForTextContent(countdown, '30s');

    await page.clock.fastForward(900);
    await waitForTextContent(countdown, '30s');

    await page.clock.fastForward(100);
    await waitForTextContent(countdown, '29s');

    await page.clock.fastForward(1000);
    await waitForTextContent(countdown, '28s');
  });

  test('should auto-dismiss after countdown reaches 0', async ({ page }) => {
    const startReview = page.getByRole('button', { name: 'Start Review' });
    await waitForElementReady(startReview);
    await startReview.click();

    await expect(page.getByText('Card 1 of 2')).toBeVisible();

    await page.clock.fastForward(30000);
    await page.clock.fastForward(1);

    await expect(page.getByText('Card 1 of 2')).not.toBeVisible();
    await expect(startReview).toBeVisible();
  });

  test('should pause timer when answer is revealed but not yet rated', async ({ page }) => {
    const startReview = page.getByRole('button', { name: 'Start Review' });
    await waitForElementReady(startReview);
    await startReview.click();

    const countdown = page.locator('.font-mono').filter({ hasText: /^\d+s$/ });
    await waitForTextContent(countdown, '30s');

    await page.clock.fastForward(5000);
    await waitForTextContent(countdown, '25s');

    await page.getByRole('button', { name: /^Show Answer/ }).click();
    await expect(page.getByRole('heading', { name: 'Back', level: 3 })).toBeVisible();

    await page.clock.fastForward(5000);
    await waitForTextContent(countdown, '25s');
  });

  test('should reset timer between cards', async ({ page }) => {
    const startReview = page.getByRole('button', { name: 'Start Review' });
    await waitForElementReady(startReview);
    await startReview.click();

    const countdown = page.locator('.font-mono').filter({ hasText: /^\d+s$/ });
    await waitForTextContent(countdown, '30s');

    await page.clock.fastForward(5000);
    await waitForTextContent(countdown, '25s');

    await page.getByRole('button', { name: /^Show Answer/ }).click();
    await expect(page.getByRole('button', { name: 'Good' })).toBeVisible();
    await page.getByRole('button', { name: 'Good' }).click();

    await expect(page.getByText('Card 2 of 2')).toBeVisible();
    await waitForTextContent(countdown, '30s');
  });

  test('should mark card as no_response on auto-dismiss', async ({ page }) => {
    const hasTauriInternals = await page.evaluate(() => '__TAURI_INTERNALS__' in window);
    test.skip(!hasTauriInternals, 'requires Tauri runtime database');

    const startReview = page.getByRole('button', { name: 'Start Review' });
    await waitForElementReady(startReview);
    await startReview.click();

    await page.clock.fastForward(30000);
    await page.clock.fastForward(1);

    const latestLog = await page.evaluate(async () => {
      const modulePath = '/src/lib/repositories/remoteDb.ts';
      const { getDatabase } = await import(modulePath);
      const db = await getDatabase();
      const rows = await db.select(
        'SELECT card_id, rating, response_type FROM review_logs ORDER BY reviewed_at DESC LIMIT 1',
      );
      return rows[0] ?? null;
    });

    expect(latestLog).not.toBeNull();
    expect(latestLog.response_type).toBe('no_response');
    expect(latestLog.rating).toBe(0);

    const dueAt = await page.evaluate(async (cardId) => {
      const modulePath = '/src/lib/repositories/remoteDb.ts';
      const { getDatabase } = await import(modulePath);
      const db = await getDatabase();
      const rows = await db.select(
        'SELECT due_at FROM card_scheduling WHERE card_id = $1 LIMIT 1',
        [cardId],
      );
      return rows[0]?.due_at ?? null;
    }, latestLog.card_id);

    expect(dueAt).not.toBeNull();
    expect(Date.parse(dueAt)).toBeGreaterThan(Date.parse('2026-01-01T00:00:00.000Z'));
  });
});
