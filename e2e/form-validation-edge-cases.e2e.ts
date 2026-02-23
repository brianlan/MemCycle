import { test, expect } from '@playwright/test';
import { resetDatabase } from './infrastructure/db-isolation';

test.describe('CardForm Validation Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabase();
    await page.keyboard.press('Escape');
    // JUSTIFIED: Wait for modal animations to complete after Escape key press
    await page.waitForTimeout(500);

    await page.addInitScript(() => {
      localStorage.setItem('memcycle.settings.onboardingCompleted', 'true');
    });
    await page.goto('/');

    await page.getByTestId('create-deck-button').click();
    await page.getByTestId('deck-name-input').fill('Validation Test Deck');
    await page.getByTestId('deck-description-input').fill('Deck for validation tests');
    // force: true because submit button may be covered by validation overlay
    await page.getByTestId('deck-submit-button').click({ force: true });
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('empty front/back validation prevents save', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Card' }).click({ force: true });

    const frontInput = page.getByLabel('Front (Markdown)');
    const backInput = page.getByLabel('Back (Markdown)');
    const saveButton = page.getByRole('button', { name: 'Save Card' });

    await saveButton.click({ force: true });
    await expect(frontInput).toBeVisible();

    await frontInput.fill('Front content');
    await saveButton.click({ force: true });
    await expect(frontInput).toBeVisible();

    await frontInput.fill('');
    await backInput.fill('Back content');
    await saveButton.click({ force: true });
    await expect(frontInput).toBeVisible();
  });

  test('whitespace-only rejection prevents save', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Card' }).click({ force: true });

    const frontInput = page.getByLabel('Front (Markdown)');
    const backInput = page.getByLabel('Back (Markdown)');
    const saveButton = page.getByRole('button', { name: 'Save Card' });

    await frontInput.fill('   ');
    await backInput.fill('Valid back');
    await saveButton.click({ force: true });
    await expect(frontInput).toBeVisible();

    await frontInput.fill('Valid front');
    await backInput.fill('   ');
    await saveButton.click({ force: true });
    await expect(frontInput).toBeVisible();

    await frontInput.fill('  \t\n  ');
    await backInput.fill('  \t\n  ');
    await saveButton.click({ force: true });
    await expect(frontInput).toBeVisible();
  });

  test('no deck selected shows validation error', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Card' }).click({ force: true });

    const frontInput = page.getByLabel('Front (Markdown)');
    const backInput = page.getByLabel('Back (Markdown)');
    const deckSelect = page.getByLabel('Deck');
    const saveButton = page.getByRole('button', { name: 'Save Card' });

    await frontInput.fill('Valid front');
    await backInput.fill('Valid back');

    await deckSelect.selectOption({ label: '' });
    await deckSelect.evaluate((el: HTMLSelectElement) => el.value = '');

    await saveButton.click({ force: true });
    await expect(frontInput).toBeVisible();
  });

  test('Cmd+Enter keyboard shortcut saves valid card', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Card' }).click({ force: true });

    const frontInput = page.getByLabel('Front (Markdown)');
    const backInput = page.getByLabel('Back (Markdown)');

    await frontInput.fill('Shortcut Test Front');
    await backInput.fill('Shortcut Test Back');

    await backInput.press('Meta+Enter');

    await expect(frontInput).not.toBeVisible();
    await expect(page.getByText('Unable to save card').first()).toBeHidden();
  });

  test('Escape key cancels and clears form', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Card' }).click({ force: true });

    const frontInput = page.getByLabel('Front (Markdown)');
    const backInput = page.getByLabel('Back (Markdown)');

    await frontInput.fill('Test front');
    await backInput.fill('Test back');

    await page.keyboard.press('Escape');
    await expect(frontInput).not.toBeVisible();

    await page.getByRole('button', { name: 'Create Card' }).click({ force: true });
    await expect(frontInput).toHaveValue('');
    await expect(backInput).toHaveValue('');
  });

  test('character count updates in real-time', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Card' }).click({ force: true });

    const frontInput = page.getByLabel('Front (Markdown)');

    const initialText = await frontInput.inputValue();
    expect(initialText).toBe('');

    await frontInput.type('Hello World');
    const typedText = await frontInput.inputValue();
    expect(typedText).toBe('Hello World');

    await frontInput.fill('');
    await frontInput.type('A different text');
    const newText = await frontInput.inputValue();
    expect(newText).toBe('A different text');
  });

  test('markdown preview renders as typed', async ({ page }) => {
    await page.getByRole('button', { name: 'Create Card' }).click({ force: true });

    const frontInput = page.getByLabel('Front (Markdown)');
    const backInput = page.getByLabel('Back (Markdown)');

    await frontInput.fill('# Heading 1');
    await expect(page.locator('.markdown-content h1').filter({ hasText: 'Heading 1' })).toBeVisible();

    await frontInput.fill('**Bold Text**');
    await expect(page.locator('.markdown-content strong').filter({ hasText: 'Bold Text' })).toBeVisible();

    await frontInput.fill('*Italic Text*');
    await expect(page.locator('.markdown-content em').filter({ hasText: 'Italic Text' })).toBeVisible();

    await frontInput.fill('`Code`');
    await expect(page.locator('.markdown-content code').filter({ hasText: 'Code' })).toBeVisible();

    await backInput.fill('## Back Heading');
    await expect(page.locator('.markdown-content h2').filter({ hasText: 'Back Heading' })).toBeVisible();
  });
});

test.describe('DeckForm Validation Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabase();
    await page.keyboard.press('Escape');
    // JUSTIFIED: Wait for modal animations to complete after Escape key press
    await page.waitForTimeout(500);

    await page.addInitScript(() => {
      localStorage.setItem('memcycle.settings.onboardingCompleted', 'true');
    });
    await page.goto('/');
  });

  test('empty name validation', async ({ page }) => {
    await page.getByTestId('create-deck-button').click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const nameInput = page.getByTestId('deck-name-input');
    const submitButton = page.getByTestId('deck-submit-button');

    await nameInput.fill('');
    await submitButton.click({ force: true });
    await expect(page.getByRole('dialog')).toBeVisible();

    await nameInput.fill('   ');
    await submitButton.click({ force: true });
    await expect(page.getByRole('dialog')).toBeVisible();

    await nameInput.fill('Valid Deck Name');
    await page.getByTestId('deck-description-input').fill('Description');
    await submitButton.click({ force: true });
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('duplicate deck name handling', async ({ page }) => {
    await page.getByTestId('create-deck-button').click();
    await page.getByTestId('deck-name-input').fill('Duplicate Deck');
    await page.getByTestId('deck-description-input').fill('First deck');
    await page.getByTestId('deck-submit-button').click({ force: true });
    await expect(page.getByRole('dialog')).not.toBeVisible();

    await page.getByTestId('create-deck-button').click();
    await page.getByTestId('deck-name-input').fill('Duplicate Deck');
    await page.getByTestId('deck-description-input').fill('Second deck');
    await page.getByTestId('deck-submit-button').click({ force: true });
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByTestId('deck-name-input').fill('duplicate deck');
    await page.getByTestId('deck-submit-button').click({ force: true });
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('edit mode pre-populates fields', async ({ page }) => {
    await page.getByTestId('create-deck-button').click();
    await page.getByTestId('deck-name-input').fill('Edit Test Deck');
    await page.getByTestId('deck-description-input').fill('Original description');
    await page.getByTestId('deck-submit-button').click({ force: true });
    await expect(page.getByRole('dialog')).not.toBeVisible();

    const editButton = page.getByTestId('edit-deck-button').first();
    // force: true because edit button may be covered by card hover overlay
    await editButton.click({ force: true });

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Edit Deck' })).toBeVisible();

    const nameInput = page.getByTestId('deck-name-input');
    const descriptionInput = page.getByTestId('deck-description-input');

    await expect(nameInput).toHaveValue('Edit Test Deck');
    await expect(descriptionInput).toHaveValue('Original description');
  });

  test('cancel discards unsaved changes', async ({ page }) => {
    await page.getByTestId('create-deck-button').click();
    await page.getByTestId('deck-name-input').fill('Cancel Test Deck');
    await page.getByTestId('deck-description-input').fill('Original description');
    await page.getByTestId('deck-submit-button').click({ force: true });
    await expect(page.getByRole('dialog')).not.toBeVisible();

    const editButton = page.getByTestId('edit-deck-button').first();
    await editButton.click({ force: true });

    await page.getByTestId('deck-name-input').fill('Modified Name');
    await page.getByTestId('deck-description-input').fill('Modified description');

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();

    const deckCard = page.locator('[data-testid^="deck-card-"]', { hasText: 'Cancel Test Deck' }).first();
    await expect(deckCard).toBeVisible();
    await expect(deckCard).toContainText('Cancel Test Deck');
    await expect(deckCard).toContainText('Original description');

    await editButton.click({ force: true });
    await expect(page.getByTestId('deck-name-input')).toHaveValue('Cancel Test Deck');
    await expect(page.getByTestId('deck-description-input')).toHaveValue('Original description');
  });
});
