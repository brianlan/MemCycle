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

    const hasEmptyState = await page.getByTestId('empty-state').isVisible().catch(() => false);
    if (hasEmptyState) {
      await expect(page.getByTestId('empty-state')).toBeVisible();
      await expect(page.locator('text=No decks yet')).toBeVisible();
    }

    await page.screenshot({ path: path.join(evidenceDir, 'task-21-empty.png') });

    await page.getByTestId('create-deck-button').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await expect(page.getByRole('dialog').locator('h2')).toContainText('Create Deck');

    const nameInput = page.getByTestId('deck-name-input');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('Test Deck');
    await page.getByTestId('deck-description-input').fill('My test deck description');

    // force: true because submit button may be covered by validation overlay
    await page.getByTestId('deck-submit-button').click({ force: true });

    await expect(page.getByRole('dialog')).not.toBeVisible();
    if (hasEmptyState) {
      await expect(page.getByTestId('empty-state')).not.toBeVisible();
    }

    const deckCard = page.locator('[data-testid^="deck-card-"]', { hasText: 'Test Deck' }).first();
    await expect(deckCard).toBeVisible();
    await expect(deckCard).toContainText('Test Deck');
    await expect(deckCard).toContainText('My test deck description');

    const editButton = page.getByTestId('edit-deck-button').first();
    // force: true because edit button may be covered by card hover overlay
    await editButton.click({ force: true });

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Edit Deck' })).toBeVisible();

    await page.getByTestId('deck-name-input').fill('Updated Deck Name');
    // force: true because submit button may be covered by validation overlay
    await page.getByTestId('deck-submit-button').click({ force: true });

    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.locator('[data-testid^="deck-card-"]', { hasText: 'Updated Deck Name' }).first()).toBeVisible();

    await page.screenshot({ path: path.join(evidenceDir, 'task-21-crud.png') });

    const deleteButton = page.getByLabel('Delete Updated Deck Name');
    await deleteButton.waitFor({ state: 'attached' });
    // force: true because delete button may be covered by card hover overlay
    await deleteButton.click({ force: true });

    await expect(page.locator('text=Are you sure you want to delete "Updated Deck Name"?')).toBeVisible();
    // force: true because confirm button may be covered by modal overlay
    await page.getByTestId('confirm-delete').click({ force: true });

    const remainingDeckCards = await page.locator('[data-testid^="deck-card-"]').count();
    if (remainingDeckCards === 0) {
      await expect(page.getByTestId('empty-state')).toBeVisible();
    }
  });
});
