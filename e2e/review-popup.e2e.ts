import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Review Popup', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('memcycle.settings.onboardingCompleted', 'true');
    });
    await page.goto('/');
  });

  test('Review Popup Flow', async ({ page }) => {
  const evidenceDir = '.sisyphus/evidence';
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }

  await page.click('text=Start Review');
  
  await expect(page.locator('text=Card 1 of 2')).toBeVisible();
  
  await expect(page.getByRole('heading', { name: 'Front', level: 3 })).toBeVisible();

  await expect(page.locator('.markdown-content')).toBeVisible();
  await expect(page.locator('h1', { hasText: 'Card 1 Front' })).toBeVisible();
  
  await page.keyboard.press('Space');
  
  await expect(page.getByRole('heading', { name: 'Back', level: 3 })).toBeVisible();
  await expect(page.locator('h1', { hasText: 'Card 1 Back' })).toBeVisible();
  
  await expect(page.getByRole('button', { name: 'Easy' })).toBeVisible();

  await page.click('body');
  await page.waitForTimeout(500); 
  await page.keyboard.press('3');
  
  await expect(page.locator('text=Card 2 of 2')).toBeVisible();
  
  fs.writeFileSync(path.join(evidenceDir, 'task-20-keyboard.txt'), 'Keyboard interaction verified: Space revealed card, Key "3" rated and advanced to next card.');
});
});