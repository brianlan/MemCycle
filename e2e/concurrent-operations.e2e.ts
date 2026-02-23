import { test, expect, type Page } from '@playwright/test';
import {
  forceClickWithJustification,
  waitForElementReady,
  waitForTextContent,
} from './infrastructure/wait-helpers';

async function createDeck(page: Page, name: string, description: string): Promise<void> {
  const createButton = page.getByTestId('create-deck-button');
  await waitForElementReady(createButton);
  await createButton.click();

  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByTestId('deck-name-input').fill(name);
  await page.getByTestId('deck-description-input').fill(description);
  // force: true because submit button may be covered by validation overlay
  await page.getByTestId('deck-submit-button').click({ force: true });
  await expect(page.getByRole('dialog')).toBeHidden();
}

async function openCardsView(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Cards' }).click();
  await expect(page.getByTestId('cards-view-container')).toBeVisible();
}

async function openCardForm(page: Page): Promise<void> {
  const cardsView = page.getByTestId('cards-view-container');
  await cardsView.getByRole('button', { name: 'Create Card' }).click();
  await expect(page.getByText('Create New Card')).toBeVisible();
}

async function saveCard(page: Page, deckName: string, front: string, back: string): Promise<void> {
  await page.getByLabel('Deck').selectOption({ label: deckName });
  await page.getByLabel('Front (Markdown)').fill(front);
  await page.getByLabel('Back (Markdown)').fill(back);
  await page.getByRole('button', { name: 'Save Card' }).click();
}

test.describe('Concurrent Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('memcycle.settings.onboardingCompleted', 'true');
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('rapid deck switching maintains integrity', async ({ page }) => {
    const deckCards = page.locator('[data-testid^="deck-card-"]');
    const startingCount = await deckCards.count();

    await createDeck(page, 'Rapid Alpha', 'First rapid deck');
    await createDeck(page, 'Rapid Beta', 'Second rapid deck');
    await createDeck(page, 'Rapid Gamma', 'Third rapid deck');

    await expect(deckCards).toHaveCount(startingCount + 3);

    const clickOrder = ['Rapid Alpha', 'Rapid Beta', 'Rapid Gamma', 'Rapid Alpha', 'Rapid Gamma'];
    for (const name of clickOrder) {
      await page.locator('[data-testid^="deck-card-"]', { hasText: name }).first().click();
    }

    await expect(deckCards).toHaveCount(startingCount + 3);
    const finalSelection = page.locator('[data-testid^="deck-card-"]', { hasText: 'Rapid Gamma' }).first();
    await expect(finalSelection.locator('.ring-2')).toBeVisible();
  });

  test('multiple rapid ratings process in order', async ({ page }) => {
    const startReview = page.getByRole('button', { name: 'Start Review' });
    await waitForElementReady(startReview);
    await startReview.click();

    await expect(page.getByText('Card 1 of 2')).toBeVisible();
    await page.getByRole('button', { name: /Show Answer/i }).click();
    await page.getByRole('button', { name: 'Good' }).click();

    await expect(page.getByText('Card 2 of 2')).toBeVisible();
    await page.getByRole('button', { name: /Show Answer/i }).click();
    await page.getByRole('button', { name: 'Easy' }).click();

    await expect(startReview).toBeVisible();
  });

  test('creating cards during another save keeps both', async ({ page }) => {
    const deckName = 'Concurrent Saves';
    await createDeck(page, deckName, 'Deck for rapid card saves');

    await openCardsView(page);

    await openCardForm(page);
    await saveCard(page, deckName, 'Concurrent Front 1', 'Concurrent Back 1');

    await openCardForm(page);
    await saveCard(page, deckName, 'Concurrent Front 2', 'Concurrent Back 2');

    const cardsList = page.getByTestId('cards-list');
    await expect(cardsList).toContainText('Concurrent Front 1');
    await expect(cardsList).toContainText('Concurrent Front 2');
    await expect(page.locator('[data-testid^="card-item-"]')).toHaveCount(2);
  });

  test('export during active review handles gracefully', async ({ page }) => {
    const startReview = page.getByRole('button', { name: 'Start Review' });
    await waitForElementReady(startReview);
    await startReview.click();

    await expect(page.getByText('Card 1 of 2')).toBeVisible();

    const trayToggle = page.getByRole('button', { name: 'Toggle Tray' });
    await forceClickWithJustification(
      trayToggle,
      'review overlay sits above the header in web demo',
    );

    await expect(page.getByRole('button', { name: 'Quit' })).toBeVisible();
    await page.getByTitle('Export/Import').click();
    await expect(page.getByText('Export/Import').first()).toBeVisible();
    await expect(page.getByText('Not implemented in web demo.').first()).toBeVisible();
    await expect(page.getByText('Card 1 of 2')).toBeVisible();
  });

  test('settings save while timer runs keeps countdown moving', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-01-01T00:00:00.000Z') });

    const startReview = page.getByRole('button', { name: 'Start Review' });
    await waitForElementReady(startReview);
    await startReview.click();

    const countdown = page.locator('.font-mono').filter({ hasText: /^\d+s$/ });
    await waitForTextContent(countdown, '30s');

    await page.clock.fastForward(2000);
    await page.clock.runFor(0);
    await waitForTextContent(countdown, '28s');

    const settingsButton = page.getByRole('button', { name: 'Settings' });
    await forceClickWithJustification(
      settingsButton,
      'settings button sits behind review overlay in web demo',
    );

    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Timing' }).click();
    await page.locator('#popupInterval').fill('60');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeHidden();

    await page.clock.fastForward(1000);
    await page.clock.runFor(0);
    await waitForTextContent(countdown, '27s');
    await expect(page.getByText('Card 1 of 2')).toBeVisible();
  });

  test('rapid settings tab switching keeps panels consistent', async ({ page }) => {
    const settingsButton = page.getByRole('button', { name: 'Settings' });
    await settingsButton.click();
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();

    const tabs = ['General', 'Timing', 'Algorithm', 'Database', 'LLM API', 'General', 'Timing'];
    for (const tab of tabs) {
      await page.getByRole('button', { name: tab }).click();
    }

    await expect(page.locator('#popupInterval')).toBeVisible();
    await page.getByRole('button', { name: 'Database' }).click();
    await expect(page.getByLabel('Local (SQLite)')).toBeVisible();
    await page.getByRole('button', { name: 'LLM API' }).click();
    await expect(page.getByLabel('API Endpoint')).toBeVisible();
    await page.getByRole('button', { name: 'General' }).click();
    await expect(page.getByLabel('Launch at Login')).toBeVisible();
  });
});
