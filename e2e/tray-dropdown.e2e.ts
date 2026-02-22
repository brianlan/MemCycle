import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Tray Dropdown', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('memcycle.settings.onboardingCompleted', 'true');
    });
    await page.goto('/');
  });

  test('Tray Dropdown Interaction', async ({ page }) => {
  const evidenceDir = '.sisyphus/evidence';
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }

  await page.click('[aria-label="Toggle Tray"]');

  await expect(page.getByText('5 cards due')).toBeVisible();
  await expect(page.getByText('7-day streak')).toBeVisible();

  await page.screenshot({ path: path.join(evidenceDir, 'task-25-stats.png') });

  await page.click('button:has-text("View Decks")');

  await expect(page.getByText('5 cards due')).not.toBeVisible();
  
  await expect(page.getByTestId('deck-list-container')).toBeVisible();

  await page.screenshot({ path: path.join(evidenceDir, 'task-25-nav.png') });
});
});