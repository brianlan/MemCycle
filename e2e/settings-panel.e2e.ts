import { test, expect } from "@playwright/test";

test.describe("Settings Panel", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('memcycle.settings.onboardingCompleted', 'true');
    });
    await page.goto("/");
  });

  test("should open settings panel and save changes", async ({ page }) => {
    test.setTimeout(60000);
    await page.waitForLoadState('networkidle');
    
    await page.getByRole("button", { name: "Settings" }).click();
    await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: "General" }).click();
    const launchCheckbox = page.getByLabel("Launch at Login");
    expect(await launchCheckbox.isChecked()).toBe(false);
    await launchCheckbox.check();

    await page.getByRole("button", { name: "Timing" }).click();
    const popupSlider = page.locator("input[type='range']").first();
    await popupSlider.fill("60"); 

    await page.getByRole("button", { name: "Database" }).click();
    await page.getByLabel("Remote (PostgreSQL)").check();
    await expect(page.getByLabel("Host")).toBeVisible();
    await page.getByLabel("Host").fill("127.0.0.1");

    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("Settings saved").first()).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Settings" })).toBeHidden();

    await page.reload();
    await page.getByRole("button", { name: "Settings" }).click();
    
    await page.getByRole("button", { name: "General" }).click();
    expect(await page.getByLabel("Launch at Login").isChecked()).toBe(true);

    await page.getByRole("button", { name: "Timing" }).click();
    
    expect(await page.locator("input[type='range']").first().inputValue()).toBe("60");

    await page.getByRole("button", { name: "Database" }).click();
    expect(await page.getByLabel("Remote (PostgreSQL)").isChecked()).toBe(true);
    expect(await page.getByLabel("Host").inputValue()).toBe("127.0.0.1");

    await page.screenshot({ path: ".sisyphus/evidence/task-24-persist.png" });
  });

  test('should test LLM connection successfully', async ({ page }) => {
    test.setTimeout(60000);
    await page.route("**/chat/completions", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          choices: [
            {
              message: {
                content: "Reckless means acting without thinking about the consequences.",
              },
            },
          ],
        }),
      });
    });

    await page.getByRole('button', { name: 'Settings' }).click();

    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
    await page.getByRole("button", { name: "LLM API" }).click();

    await page.getByPlaceholder("sk-...").fill("sk-test-key");
    const endpointInput = page.getByPlaceholder("https://api.openai.com/v1/chat/completions");
    if (await endpointInput.inputValue() === "") {
        await endpointInput.fill("https://api.openai.com/v1/chat/completions");
    }

    await page.getByRole("button", { name: "Test Connection" }).click();

    await expect(page.getByText("LLM Test Successful").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Response: Reckless means acting").first()).toBeVisible({ timeout: 15000 });

    await page.screenshot({ path: ".sisyphus/evidence/task-24-llm-test.png" });
  });

  test('should handle LLM connection failure', async ({ page }) => {
    test.setTimeout(60000);
    await page.route("**/chat/completions", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            message: "Invalid API Key",
          },
        }),
      });
    });

    await page.getByRole('button', { name: 'Settings' }).click();

    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
    await page.getByRole("button", { name: "LLM API" }).click();

    await page.getByPlaceholder("sk-...").fill("sk-invalid-key");
    const endpointInput = page.getByPlaceholder("https://api.openai.com/v1/chat/completions");
    if (await endpointInput.inputValue() === "") {
        await endpointInput.fill("https://api.openai.com/v1/chat/completions");
    }

    await page.getByRole("button", { name: "Test Connection" }).click();

    await expect(page.getByText("LLM Test Failed").first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Invalid API Key").first()).toBeVisible({ timeout: 15000 });
  });
});
