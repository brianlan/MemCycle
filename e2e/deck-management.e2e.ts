import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.describe('Deck Management', () => {
  const evidenceDir = '.sisyphus/evidence';
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.localStorage.clear());
    await page.evaluate(() => {
      localStorage.setItem('memcycle.settings.onboardingCompleted', 'true');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('Empty State -> Create -> Edit -> Delete', async ({ page }) => {
    test.setTimeout(60000);
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => {
      return document.querySelector('[data-testid="app-ready"]') || document.querySelector('[data-testid="empty-state"]');
    }, { timeout: 10000 });

    await expect(page.getByTestId('empty-state')).toBeVisible();
    await expect(page.locator('text=No decks yet')).toBeVisible();
    
    await page.screenshot({ path: path.join(evidenceDir, 'task-21-empty.png') });

    await page.getByTestId('create-deck-button').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    
    await expect(page.getByRole('dialog').locator('h2')).toContainText('Create Deck');

    const nameInput = page.getByTestId('deck-name-input');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('Test Deck');
    await page.getByTestId('deck-description-input').fill('My test deck description');
    
    await page.getByTestId('deck-submit-button').click({ force: true });

    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByTestId('empty-state')).not.toBeVisible();
    
    const deckCard = page.locator('[data-testid^="deck-card-"]').first();
    await expect(deckCard).toBeVisible();
    await expect(deckCard).toContainText('Test Deck');
    await expect(deckCard).toContainText('My test deck description');

    const editButton = page.getByTestId('edit-deck-button').first();
    await editButton.click({ force: true });

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Edit Deck' })).toBeVisible();
    
    await page.getByTestId('deck-name-input').fill('Updated Deck Name');
    await page.getByTestId('deck-submit-button').click({ force: true });

    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.locator('text=Updated Deck Name')).toBeVisible();
    
    await page.screenshot({ path: path.join(evidenceDir, 'task-21-crud.png') });

    const deleteButton = page.getByLabel('Delete Updated Deck Name');
    await deleteButton.waitFor({ state: 'attached' });
    await deleteButton.click({ force: true });

    await expect(page.locator('text=Are you sure you want to delete "Updated Deck Name"?')).toBeVisible();
    await page.getByTestId('confirm-delete').click({ force: true });

    await expect(page.getByTestId('empty-state')).toBeVisible();
  });
});
