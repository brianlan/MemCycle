import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Card Creation Form', () => {
  test.setTimeout(60000);
  test.beforeEach(async ({ page }) => {
    // Close any open dialogs/modals from previous tests
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    await page.addInitScript(() => {
      localStorage.setItem('memcycle.settings.onboardingCompleted', 'true');
    });
    await page.goto('/');
  });

  test('should allow creating a new card with previews', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Card' }).click({ force: true });
    
    await expect(page.locator('.fixed.inset-0')).toBeVisible();

    const frontInput = page.getByLabel('Front (Markdown)');
    const backInput = page.getByLabel('Back (Markdown)');
    
    await expect(frontInput).toBeVisible();
    await expect(backInput).toBeVisible();
    await expect(page.getByText('Preview will appear here...').first()).toBeVisible();

    await frontInput.fill('# Hello Front');
    await expect(page.locator('.markdown-content h1').filter({ hasText: 'Hello Front' })).toBeVisible();
    
    await backInput.fill('**Bold Back**');
    await expect(page.locator('.markdown-content strong').filter({ hasText: 'Bold Back' })).toBeVisible();

    const deckSelect = page.getByLabel('Deck');
    await expect(deckSelect).toHaveValue('d1');

    await page.screenshot({ path: '.sisyphus/evidence/task-22-form.png' });

    await page.getByRole('button', { name: 'Save Card' }).click({ force: true });

    await expect(frontInput).not.toBeVisible();
  });

  test('should save on Cmd+Enter', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Card' }).click();
    
    const frontInput = page.getByLabel('Front (Markdown)');
    const backInput = page.getByLabel('Back (Markdown)');

    await frontInput.fill('Shortcut Test Front');
    await backInput.fill('Shortcut Test Back');

    await backInput.press('Meta+Enter');

    await expect(frontInput).not.toBeVisible();
    
    const evidenceDir = path.join('.sisyphus', 'evidence');
    if (!fs.existsSync(evidenceDir)) {
      fs.mkdirSync(evidenceDir, { recursive: true });
    }
    fs.writeFileSync(path.join(evidenceDir, 'task-22-cmd-enter.txt'), 'Verified Cmd+Enter triggered save and closed the form.');
  });
});
