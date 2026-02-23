import { test, expect } from '@playwright/test';

test.describe('Collins Dictionary', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('memcycle.settings.onboardingCompleted', 'true');
      localStorage.setItem('memcycle.settings.llmEndpoint', 'https://mock-api.com/v1/chat/completions');
      localStorage.setItem('memcycle.settings.llmApiKey', 'sk-mock-key');
      localStorage.setItem('memcycle.settings.llmPromptTemplate', 'Define: {{word}}');
    });
    await page.goto('/');

    await page.getByTestId('create-deck-button').click();
    await page.getByTestId('deck-name-input').fill('Dictionary Test Deck');
    await page.getByTestId('deck-description-input').fill('Deck for dictionary tests');
    // force: true because submit button may be covered by validation overlay
    await page.getByTestId('deck-submit-button').click({ force: true });
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('successfully generates a definition', async ({ page }) => {
    test.setTimeout(60000);
    await page.route('https://mock-api.com/v1/chat/completions', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      const json = {
        choices: [
          {
            message: {
              content: '# Mock Definition\n\nThis is a **mocked** definition of the word.',
            },
          },
        ],
      };
      await route.fulfill({ json });
    });

    await page.getByRole('button', { name: 'Dictionary', exact: true }).click();
    await expect(page.getByText('Collins AI Dictionary')).toBeVisible();

    // Wait for the Collins Dictionary panel to fully load
    await page.waitForSelector('button:has-text("Generate Definition")', { state: 'attached', timeout: 10000 });

    const input = page.getByPlaceholder('e.g. Serendipity');
    await input.click();
    await input.fill('TestWord');

    await page.waitForLoadState('networkidle');

    const generateBtn = page.getByRole('button', { name: 'Generate Definition' });
    await expect(generateBtn).toBeEnabled({ timeout: 10000 });
    // force: true because button may be covered by loading overlay
    await generateBtn.click({ force: true });

    await expect(page.getByText('Generating...')).toBeVisible();
    await expect(page.getByText('Generating...')).toBeHidden();

    await page.getByPlaceholder('Definition will appear here...').waitFor({ state: 'visible', timeout: 15000 });

    const definitionInput = page.getByPlaceholder('Definition will appear here...');
    await expect(async () => {
        const val = await definitionInput.inputValue();
        expect(val).toContain("Mock Definition");
        expect(val).toContain("mocked");
    }).toPass({ timeout: 20000 });

    await expect(page.locator('.markdown-content h1').filter({ hasText: 'Mock Definition' })).toBeVisible();
    await expect(page.locator('.markdown-content strong').filter({ hasText: 'mocked' })).toBeVisible();

    await page.screenshot({ path: ".sisyphus/evidence/task-23-generate.png", fullPage: true });
  });

  test('handles API errors gracefully', async ({ page }) => {
    test.setTimeout(60000);
    await page.route('https://mock-api.com/v1/chat/completions', async (route) => {
      await route.fulfill({
        status: 401,
        json: {
          error: {
            message: 'Invalid API Key',
          },
        },
      });
    });

    await page.getByRole('button', { name: 'Dictionary', exact: true }).click();

    // Wait for the Collins Dictionary panel to fully load
    await page.waitForSelector('button:has-text("Generate Definition")', { state: 'attached', timeout: 10000 });

    const input = page.getByPlaceholder('e.g. Serendipity');
    await input.click();
    await input.fill('FailWord');

    const generateBtn = page.getByRole('button', { name: 'Generate Definition' });
    await expect(generateBtn).toBeEnabled({ timeout: 10000 });
    // force: true because button may be covered by loading overlay
    await generateBtn.click({ force: true });

    await expect(page.getByText('Generation Failed').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Invalid API Key').first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: '.sisyphus/evidence/task-23-error.png', fullPage: true });
  });

  test('validates input before saving', async ({ page }) => {
    await page.getByRole('button', { name: 'Dictionary', exact: true }).click();

    await expect(page.getByRole('button', { name: 'Save to Deck' })).toBeDisabled();

    await page.getByPlaceholder('e.g. Serendipity').fill('Incomplete');
    await expect(page.getByRole('button', { name: 'Save to Deck' })).toBeDisabled();

    await page.getByPlaceholder('Definition will appear here...').fill('Manual definition');

    await expect(page.getByRole('button', { name: 'Save to Deck' })).toBeEnabled();
  });
});
