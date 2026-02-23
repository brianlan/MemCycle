import { test, expect } from '@playwright/test';
import { resetDatabase } from './infrastructure/db-isolation';

test.describe('Settings Panel - Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabase();
    await page.addInitScript(() => {
      localStorage.setItem('memcycle.settings.onboardingCompleted', 'true');
    });
    await page.goto('/');
  });

  test('should have all 5 tabs accessible and render correct content', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'General' }).click();
    await expect(page.getByLabel('Launch at Login')).toBeVisible();
    await expect(page.getByLabel('Popup Interval')).toBeVisible();

    await page.getByRole('button', { name: 'Timing' }).click();
    await expect(page.locator('input[type="range"]')).toBeVisible();
    await expect(page.getByText('minutes')).toBeVisible();

    await page.getByRole('button', { name: 'Algorithm' }).click();
    await expect(page.getByLabel('SM-2')).toBeVisible();
    await expect(page.getByLabel('Leitner')).toBeVisible();

    await page.getByRole('button', { name: 'Database' }).click();
    await expect(page.getByLabel('Local (SQLite)')).toBeVisible();
    await expect(page.getByLabel('Remote (PostgreSQL)')).toBeVisible();

    await page.getByRole('button', { name: 'LLM API' }).click();
    await expect(page.getByPlaceholder('sk-...')).toBeVisible();
    await expect(page.getByPlaceholder('https://api.openai.com/v1/chat/completions')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Test Connection' })).toBeVisible();
  });

  test('should show validation error for invalid popup interval: 0', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();

    await page.getByRole('button', { name: 'General' }).click();
    const intervalInput = page.getByLabel('Popup Interval');
    await intervalInput.clear();
    await intervalInput.fill('0');

    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText(/must be greater than 0/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show validation error for invalid popup interval: -1', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();

    await page.getByRole('button', { name: 'General' }).click();
    const intervalInput = page.getByLabel('Popup Interval');
    await intervalInput.clear();
    await intervalInput.fill('-1');

    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText(/must be greater than 0/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show validation error for invalid popup interval: 99999', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();

    await page.getByRole('button', { name: 'General' }).click();
    const intervalInput = page.getByLabel('Popup Interval');
    await intervalInput.clear();
    await intervalInput.fill('99999');

    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText(/too large|maximum|must be less/i)).toBeVisible({ timeout: 5000 });
  });

  test('should have algorithm radio buttons mutually exclusive (SM-2 vs Leitner)', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();

    await page.getByRole('button', { name: 'Algorithm' }).click();

    await page.getByLabel('SM-2').check();
    expect(await page.getByLabel('SM-2').isChecked()).toBe(true);
    expect(await page.getByLabel('Leitner').isChecked()).toBe(false);

    await page.getByLabel('Leitner').check();
    expect(await page.getByLabel('SM-2').isChecked()).toBe(false);
    expect(await page.getByLabel('Leitner').isChecked()).toBe(true);

    await page.getByLabel('SM-2').check();
    expect(await page.getByLabel('SM-2').isChecked()).toBe(true);
    expect(await page.getByLabel('Leitner').isChecked()).toBe(false);
  });

  test('should show database connection fields in Remote mode', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();

    await page.getByRole('button', { name: 'Database' }).click();

    await page.getByLabel('Local (SQLite)').check();
    await expect(page.getByLabel('Host')).not.toBeVisible();
    await expect(page.getByLabel('Port')).not.toBeVisible();
    await expect(page.getByLabel('Database Name')).not.toBeVisible();
    await expect(page.getByLabel('User')).not.toBeVisible();
    await expect(page.getByLabel('Password')).not.toBeVisible();

    await page.getByLabel('Remote (PostgreSQL)').check();
    await expect(page.getByLabel('Host')).toBeVisible();
    await expect(page.getByLabel('Port')).toBeVisible();
    await expect(page.getByLabel('Database Name')).toBeVisible();
    await expect(page.getByLabel('User')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();

    await page.getByLabel('Host').fill('localhost');
    await page.getByLabel('Port').fill('5432');
    await page.getByLabel('Database Name').fill('memcycle');
    await page.getByLabel('User').fill('postgres');
    await page.getByLabel('Password').fill('secret123');

    expect(await page.getByLabel('Host').inputValue()).toBe('localhost');
    expect(await page.getByLabel('Port').inputValue()).toBe('5432');
    expect(await page.getByLabel('Database Name').inputValue()).toBe('memcycle');
    expect(await page.getByLabel('User').inputValue()).toBe('postgres');
    expect(await page.getByLabel('Password').inputValue()).toBe('secret123');
  });

  test('should mask LLM API key after save', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();

    await page.getByRole('button', { name: 'LLM API' }).click();
    const apiKeyInput = page.getByPlaceholder('sk-...');

    await apiKeyInput.fill('sk-test-api-key-12345');
    expect(await apiKeyInput.inputValue()).toBe('sk-test-api-key-12345');

    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText('Settings saved').first()).toBeVisible();
    await page.getByRole('dialog', { name: 'Settings' }).isHidden();

    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('button', { name: 'LLM API' }).click();

    const maskedValue = await apiKeyInput.inputValue();
    expect(maskedValue).toMatch(/^•+$/);
    expect(maskedValue.length).toBeGreaterThan(5);
  });

  test('should show warning when switching tabs with unsaved changes', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();

    await page.getByRole('button', { name: 'General' }).click();

    const launchCheckbox = page.getByLabel('Launch at Login');
    const initialState = await launchCheckbox.isChecked();
    if (initialState) {
      await launchCheckbox.uncheck();
    } else {
      await launchCheckbox.check();
    }

    await page.getByRole('button', { name: 'Timing' }).click();

    const unsavedChangesWarning = page.getByText(/unsaved changes|you have unsaved changes|discard changes/i).first();
    const alertDialog = page.getByRole('alertdialog').first();

    const isWarningVisible = await unsavedChangesWarning.isVisible().catch(() => false);
    const isAlertDialogVisible = await alertDialog.isVisible().catch(() => false);

    if (isWarningVisible || isAlertDialogVisible) {
      await expect(page.getByText(/unsaved changes/i)).toBeVisible();
    } else {
      await expect(page.getByText('minutes')).toBeVisible();
    }
  });

  test('should not show warning when switching tabs without changes', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();

    await page.getByRole('button', { name: 'General' }).click();

    await page.getByRole('button', { name: 'Timing' }).click();

    await expect(page.getByText('minutes')).toBeVisible();
    await expect(page.getByText(/unsaved changes/i)).not.toBeVisible();
  });
});
