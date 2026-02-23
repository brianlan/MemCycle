import { test, expect } from '@playwright/test';
import { getDatabase } from '../src/lib/repositories/remoteDb';

test.describe('Collins Dictionary Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('memcycle.settings.onboardingCompleted', 'true');
      localStorage.setItem('memcycle.settings.llmEndpoint', 'https://mock-api.com/v1/chat/completions');
      localStorage.setItem('memcycle.settings.llmApiKey', 'sk-mock-key');
      localStorage.setItem('memcycle.settings.llmPromptTemplate', 'Define: {{word}}');
    });
    await page.goto('/');

    await page.getByTestId('create-deck-button').click();
    await page.getByTestId('deck-name-input').fill('Edge Case Test Deck');
    await page.getByTestId('deck-description-input').fill('Deck for edge case tests');
    await page.getByTestId('deck-submit-button').click({ force: true });
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('empty word input blocks Generate button', async ({ page }) => {
    await page.getByRole('button', { name: 'Dictionary', exact: true }).click();
    await expect(page.getByText('Collins AI Dictionary')).toBeVisible();

    const wordInput = page.getByPlaceholder('e.g. Serendipity');
    const generateBtn = page.getByRole('button', { name: 'Generate Definition' });

    await expect(generateBtn).toBeDisabled();

    await wordInput.fill(' ');
    await wordInput.fill('');
    await expect(generateBtn).toBeDisabled();

    await wordInput.fill('test');
    await expect(generateBtn).toBeEnabled();
  });

  test('loading state shows spinner during API call', async ({ page }) => {
    test.setTimeout(60000);

    let apiCalled = false;
    await page.route('**/api/llm/**', async (route) => {
      apiCalled = true;
      await new Promise(resolve => setTimeout(resolve, 1500));
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ definition: '**test** (noun)\n\nA sample definition.' })
      });
    });

    await page.getByRole('button', { name: 'Dictionary', exact: true }).click();
    await page.waitForSelector('button:has-text("Generate Definition")', { state: 'attached', timeout: 10000 });

    const wordInput = page.getByPlaceholder('e.g. Serendipity');
    const generateBtn = page.getByRole('button', { name: 'Generate Definition' });

    await wordInput.fill('testword');
    await generateBtn.click();

    await expect(page.getByText('Generating...')).toBeVisible();
    
    await expect.poll(async () => apiCalled).toBeTruthy();
    
    await expect(page.getByText('Generating...')).toBeHidden();
  });

  test('API error displays toast with error message', async ({ page }) => {
    test.setTimeout(60000);

    await page.route('**/api/llm/**', async (route) => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });

    await page.getByRole('button', { name: 'Dictionary', exact: true }).click();
    await page.waitForSelector('button:has-text("Generate Definition")', { state: 'attached', timeout: 10000 });

    const wordInput = page.getByPlaceholder('e.g. Serendipity');
    const generateBtn = page.getByRole('button', { name: 'Generate Definition' });

    await wordInput.fill('errorword');
    await generateBtn.click({ force: true });

    await expect(page.getByText('Generation Failed')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/internal server error/i)).toBeVisible({ timeout: 5000 });
  });

  test('successful generation populates definition field', async ({ page }) => {
    test.setTimeout(60000);

    const mockDefinition = '**ephemeral** (adjective)\n\nLasting for a very short time.';
    
    await page.route('**/api/llm/**', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ definition: mockDefinition })
      });
    });

    await page.getByRole('button', { name: 'Dictionary', exact: true }).click();
    await page.waitForSelector('button:has-text("Generate Definition")', { state: 'attached', timeout: 10000 });

    const wordInput = page.getByPlaceholder('e.g. Serendipity');
    const generateBtn = page.getByRole('button', { name: 'Generate Definition' });
    const definitionInput = page.getByPlaceholder('Definition will appear here...');

    await wordInput.fill('ephemeral');
    await generateBtn.click({ force: true });

    await expect(definitionInput).toBeVisible({ timeout: 15000 });
    
    await expect.poll(async () => {
      const val = await definitionInput.inputValue();
      return val.includes('ephemeral');
    }).toBeTruthy();
  });

  test('save button requires both word and definition', async ({ page }) => {
    await page.getByRole('button', { name: 'Dictionary', exact: true }).click();
    await expect(page.getByText('Collins AI Dictionary')).toBeVisible();

    const wordInput = page.getByPlaceholder('e.g. Serendipity');
    const definitionInput = page.getByPlaceholder('Definition will appear here...');
    const saveBtn = page.getByRole('button', { name: 'Save to Deck' });

    await expect(saveBtn).toBeDisabled();

    await wordInput.fill('testword');
    await expect(saveBtn).toBeDisabled();

    await wordInput.fill('');
    await definitionInput.fill('A test definition');
    await expect(saveBtn).toBeDisabled();

    await wordInput.fill('testword');
    await expect(saveBtn).toBeEnabled();
  });

  test('saved card includes source: "collinsdictionary" metadata', async ({ page }) => {
    test.setTimeout(60000);

    const mockDefinition = '**ubiquitous** (adjective)\n\nPresent, appearing, or found everywhere.';
    
    await page.route('**/api/llm/**', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ definition: mockDefinition })
      });
    });

    await page.getByRole('button', { name: 'Dictionary', exact: true }).click();
    await page.waitForSelector('button:has-text("Generate Definition")', { state: 'attached', timeout: 10000 });

    const wordInput = page.getByPlaceholder('e.g. Serendipity');
    const generateBtn = page.getByRole('button', { name: 'Generate Definition' });
    const saveBtn = page.getByRole('button', { name: 'Save to Deck' });

    await wordInput.fill('ubiquitous');
    await generateBtn.click({ force: true });

    await page.getByPlaceholder('Definition will appear here...').waitFor({ state: 'visible', timeout: 15000 });
    await expect(saveBtn).toBeEnabled();

    await saveBtn.click();

    await page.waitForTimeout(500);

    const db = await getDatabase();
    const cards = await db.select<Array<{ front: string; back: string; source: string }>>(
      `SELECT front, back, source 
       FROM cards 
       WHERE front = $1`,
      ['ubiquitous']
    );

    expect(cards.length).toBeGreaterThan(0);
    expect(cards[0].source).toBe('collinsdictionary');
    expect(cards[0].front).toContain('ubiquitous');
    expect(cards[0].back).toContain('ubiquitous');
  });

  test('enter key in word field triggers Generate', async ({ page }) => {
    test.setTimeout(60000);

    let generateCalled = false;
    
    await page.route('**/api/llm/**', async (route) => {
      generateCalled = true;
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ definition: '**test** (noun)\n\nDefinition.' })
      });
    });

    await page.getByRole('button', { name: 'Dictionary', exact: true }).click();
    await page.waitForSelector('button:has-text("Generate Definition")', { state: 'attached', timeout: 10000 });

    const wordInput = page.getByPlaceholder('e.g. Serendipity');
    const definitionInput = page.getByPlaceholder('Definition will appear here...');

    await wordInput.fill('testword');
    
    await wordInput.press('Enter');

    await expect.poll(async () => generateCalled, { timeout: 10000 }).toBeTruthy();
    
    await expect(definitionInput).toBeVisible({ timeout: 15000 });
  });

  test('definition preview renders markdown correctly', async ({ page }) => {
    test.setTimeout(60000);

    const markdownDefinition = '**serendipity** (noun)\n\nThe occurrence of events by chance in a happy way.\n\n*Example: Finding a $20 bill on the ground.*';
    
    await page.route('**/api/llm/**', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ definition: markdownDefinition })
      });
    });

    await page.getByRole('button', { name: 'Dictionary', exact: true }).click();
    await page.waitForSelector('button:has-text("Generate Definition")', { state: 'attached', timeout: 10000 });

    const wordInput = page.getByPlaceholder('e.g. Serendipity');
    const generateBtn = page.getByRole('button', { name: 'Generate Definition' });

    await wordInput.fill('serendipity');
    await generateBtn.click({ force: true });

    await page.waitForSelector('.markdown-content', { timeout: 15000 });

    await expect(page.locator('.markdown-content strong').filter({ hasText: 'serendipity' })).toBeVisible();
    await expect(page.locator('.markdown-content em').filter({ hasText: 'noun' })).toBeVisible();
    await expect(page.locator('.markdown-content').filter({ hasText: /The occurrence of events/ })).toBeVisible();
  });

  test('form clears after successful save', async ({ page }) => {
    test.setTimeout(60000);

    const mockDefinition = '**ephemeral** (adjective)\n\nLasting for a very short time.';
    
    await page.route('**/api/llm/**', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ definition: mockDefinition })
      });
    });

    await page.getByRole('button', { name: 'Dictionary', exact: true }).click();
    await page.waitForSelector('button:has-text("Generate Definition")', { state: 'attached', timeout: 10000 });

    const wordInput = page.getByPlaceholder('e.g. Serendipity');
    const definitionInput = page.getByPlaceholder('Definition will appear here...');
    const generateBtn = page.getByRole('button', { name: 'Generate Definition' });
    const saveBtn = page.getByRole('button', { name: 'Save to Deck' });

    await wordInput.fill('ephemeral');
    await generateBtn.click({ force: true });

    await definitionInput.waitFor({ state: 'visible', timeout: 15000 });
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    await page.waitForTimeout(500);

    await expect.poll(async () => {
      const val = await wordInput.inputValue();
      return val === '';
    }).toBeTruthy();

    await expect.poll(async () => {
      const val = await definitionInput.inputValue();
      return val === '';
    }).toBeTruthy();

    await expect(saveBtn).toBeDisabled();
  });
});
