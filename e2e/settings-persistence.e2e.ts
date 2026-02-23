import { test, expect } from "@playwright/test";

test.describe("Settings Persistence", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('memcycle.settings.onboardingCompleted', 'true');
    });
    await page.goto("/");
  });

  test.describe("General Settings", () => {
    test("Launch at Login persists after save and reload", async ({ page }) => {
      test.setTimeout(60000);
      await page.waitForLoadState('networkidle');

      await page.getByRole("button", { name: "Settings" }).click();
      await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();

      await page.getByRole("button", { name: "General" }).click();
      const launchCheckbox = page.getByLabel("Launch at Login");

      const initialValue = await launchCheckbox.isChecked();
      await launchCheckbox.setChecked(!initialValue);
      expect(await launchCheckbox.isChecked()).toBe(!initialValue);

      await page.getByRole("button", { name: "Save Changes" }).click();
      await expect(page.getByText("Settings saved").first()).toBeVisible();
      await expect(page.getByRole("dialog", { name: "Settings" })).toBeHidden();

      await page.reload();

      await page.getByRole("button", { name: "Settings" }).click();
      await page.getByRole("button", { name: "General" }).click();
      expect(await launchCheckbox.isChecked()).toBe(!initialValue);

      await launchCheckbox.setChecked(initialValue);
      await page.getByRole("button", { name: "Save Changes" }).click();
    });
  });

  test.describe("Timing Settings", () => {
    test("Popup Interval persists after save and reload", async ({ page }) => {
      test.setTimeout(60000);
      await page.waitForLoadState('networkidle');

      await page.getByRole("button", { name: "Settings" }).click();
      await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();

      await page.getByRole("button", { name: "Timing" }).click();
      const popupSlider = page.locator("#popupInterval");

      const initialValue = await popupSlider.inputValue();
      const newValue = initialValue === "25" ? "60" : "25";
      await popupSlider.fill(newValue);
      expect(await popupSlider.inputValue()).toBe(newValue);

      await page.getByRole("button", { name: "Save Changes" }).click();
      await expect(page.getByText("Settings saved").first()).toBeVisible();
      await expect(page.getByRole("dialog", { name: "Settings" })).toBeHidden();

      await page.reload();

      await page.getByRole("button", { name: "Settings" }).click();
      await page.getByRole("button", { name: "Timing" }).click();
      expect(await popupSlider.inputValue()).toBe(newValue);

      await popupSlider.fill(initialValue);
      await page.getByRole("button", { name: "Save Changes" }).click();
    });

    test("Auto-dismiss persists after save and reload", async ({ page }) => {
      test.setTimeout(60000);
      await page.waitForLoadState('networkidle');

      await page.getByRole("button", { name: "Settings" }).click();
      await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();

      await page.getByRole("button", { name: "Timing" }).click();
      const dismissSlider = page.locator("#autoDismiss");

      const initialValue = await dismissSlider.inputValue();
      const newValue = initialValue === "30" ? "45" : "30";
      await dismissSlider.fill(newValue);
      expect(await dismissSlider.inputValue()).toBe(newValue);

      await page.getByRole("button", { name: "Save Changes" }).click();
      await expect(page.getByText("Settings saved").first()).toBeVisible();
      await expect(page.getByRole("dialog", { name: "Settings" })).toBeHidden();

      await page.reload();

      await page.getByRole("button", { name: "Settings" }).click();
      await page.getByRole("button", { name: "Timing" }).click();
      expect(await dismissSlider.inputValue()).toBe(newValue);

      await dismissSlider.fill(initialValue);
      await page.getByRole("button", { name: "Save Changes" }).click();
    });
  });

  test.describe("Algorithm Settings", () => {
    test("SM-2 algorithm persists after save and reload", async ({ page }) => {
      test.setTimeout(60000);
      await page.waitForLoadState('networkidle');

      await page.getByRole("button", { name: "Settings" }).click();
      await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();

      await page.getByRole("button", { name: "Algorithm" }).click();

      await page.getByText("SuperMemo 2 (SM-2)").click();

      const sm2Radio = page.locator("input[type='radio']").first();
      expect(await sm2Radio.isChecked()).toBe(true);

      await page.getByRole("button", { name: "Save Changes" }).click();
      await expect(page.getByText("Settings saved").first()).toBeVisible();
      await expect(page.getByRole("dialog", { name: "Settings" })).toBeHidden();

      await page.reload();

      await page.getByRole("button", { name: "Settings" }).click();
      await page.getByRole("button", { name: "Algorithm" }).click();
      expect(await sm2Radio.isChecked()).toBe(true);
    });

    test("Leitner algorithm persists after save and reload", async ({ page }) => {
      test.setTimeout(60000);
      await page.waitForLoadState('networkidle');

      await page.getByRole("button", { name: "Settings" }).click();
      await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();

      await page.getByRole("button", { name: "Algorithm" }).click();

      await page.getByText("Leitner System").click();

      const leitnerRadio = page.locator("input[type='radio']").nth(1);
      expect(await leitnerRadio.isChecked()).toBe(true);

      await page.getByRole("button", { name: "Save Changes" }).click();
      await expect(page.getByText("Settings saved").first()).toBeVisible();
      await expect(page.getByRole("dialog", { name: "Settings" })).toBeHidden();

      await page.reload();

      await page.getByRole("button", { name: "Settings" }).click();
      await page.getByRole("button", { name: "Algorithm" }).click();
      expect(await leitnerRadio.isChecked()).toBe(true);

      await page.getByText("SuperMemo 2 (SM-2)").click();
      await page.getByRole("button", { name: "Save Changes" }).click();
    });
  });

  test.describe("Database Settings", () => {
    test("Local database mode persists after save and reload", async ({ page }) => {
      test.setTimeout(60000);
      await page.waitForLoadState('networkidle');

      await page.getByRole("button", { name: "Settings" }).click();
      await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();

      await page.getByRole("button", { name: "Database" }).click();

      await page.getByLabel("Local (SQLite)").check();

      expect(await page.getByLabel("Local (SQLite)").isChecked()).toBe(true);

      await page.getByRole("button", { name: "Save Changes" }).click();
      await expect(page.getByText("Settings saved").first()).toBeVisible();
      await expect(page.getByRole("dialog", { name: "Settings" })).toBeHidden();

      await page.reload();

      await page.getByRole("button", { name: "Settings" }).click();
      await page.getByRole("button", { name: "Database" }).click();
      expect(await page.getByLabel("Local (SQLite)").isChecked()).toBe(true);
    });

    test("Remote database mode persists after save and reload", async ({ page }) => {
      test.setTimeout(60000);
      await page.waitForLoadState('networkidle');

      await page.getByRole("button", { name: "Settings" }).click();
      await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();

      await page.getByRole("button", { name: "Database" }).click();

      await page.getByLabel("Remote (PostgreSQL)").check();

      await page.getByLabel("Host").fill("test-host");
      await page.getByLabel("Port").fill("5433");
      await page.getByLabel("Database Name").fill("test-db");
      await page.getByLabel("User").fill("test-user");
      await page.getByLabel("Password").fill("test-pass");

      await page.getByRole("button", { name: "Save Changes" }).click();
      await expect(page.getByText("Settings saved").first()).toBeVisible();
      await expect(page.getByRole("dialog", { name: "Settings" })).toBeHidden();

      await page.reload();

      await page.getByRole("button", { name: "Settings" }).click();
      await page.getByRole("button", { name: "Database" }).click();
      expect(await page.getByLabel("Remote (PostgreSQL)").isChecked()).toBe(true);
      expect(await page.getByLabel("Host").inputValue()).toBe("test-host");
      expect(await page.getByLabel("Port").inputValue()).toBe("5433");
      expect(await page.getByLabel("Database Name").inputValue()).toBe("test-db");
      expect(await page.getByLabel("User").inputValue()).toBe("test-user");
      expect(await page.getByLabel("Password").inputValue()).toBe("test-pass");

      await page.getByLabel("Local (SQLite)").check();
      await page.getByRole("button", { name: "Save Changes" }).click();
    });
  });

  test.describe("LLM API Settings", () => {
    test("API Endpoint persists after save and reload", async ({ page }) => {
      test.setTimeout(60000);
      await page.waitForLoadState('networkidle');

      await page.getByRole("button", { name: "Settings" }).click();
      await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();

      await page.getByRole("button", { name: "LLM API" }).click();

      const endpointInput = page.getByPlaceholder("https://api.openai.com/v1/chat/completions");
      const testEndpoint = "https://test.api.example.com/v1/chat/completions";

      await endpointInput.fill(testEndpoint);
      expect(await endpointInput.inputValue()).toBe(testEndpoint);

      await page.getByRole("button", { name: "Save Changes" }).click();
      await expect(page.getByText("Settings saved").first()).toBeVisible();
      await expect(page.getByRole("dialog", { name: "Settings" })).toBeHidden();

      await page.reload();

      await page.getByRole("button", { name: "Settings" }).click();
      await page.getByRole("button", { name: "LLM API" }).click();
      expect(await endpointInput.inputValue()).toBe(testEndpoint);

      await endpointInput.fill("");
      await page.getByRole("button", { name: "Save Changes" }).click();
    });

    test("API Key persists after save and reload", async ({ page }) => {
      test.setTimeout(60000);
      await page.waitForLoadState('networkidle');

      await page.getByRole("button", { name: "Settings" }).click();
      await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();

      await page.getByRole("button", { name: "LLM API" }).click();

      const apiKeyInput = page.getByPlaceholder("sk-...");
      const testKey = "sk-test-persistence-key-12345";

      await apiKeyInput.fill(testKey);
      expect(await apiKeyInput.inputValue()).toBe(testKey);

      await page.getByRole("button", { name: "Save Changes" }).click();
      await expect(page.getByText("Settings saved").first()).toBeVisible();
      await expect(page.getByRole("dialog", { name: "Settings" })).toBeHidden();

      await page.reload();

      await page.getByRole("button", { name: "Settings" }).click();
      await page.getByRole("button", { name: "LLM API" }).click();
      expect(await apiKeyInput.inputValue()).toBe(testKey);

      await apiKeyInput.fill("");
      await page.getByRole("button", { name: "Save Changes" }).click();
    });

    test("Model Name persists after save and reload", async ({ page }) => {
      test.setTimeout(60000);
      await page.waitForLoadState('networkidle');

      await page.getByRole("button", { name: "Settings" }).click();
      await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();

      await page.getByRole("button", { name: "LLM API" }).click();

      const modelInput = page.getByPlaceholder("gpt-4o-mini");
      const testModel = "gpt-4-turbo-preview";

      await modelInput.fill(testModel);
      expect(await modelInput.inputValue()).toBe(testModel);

      await page.getByRole("button", { name: "Save Changes" }).click();
      await expect(page.getByText("Settings saved").first()).toBeVisible();
      await expect(page.getByRole("dialog", { name: "Settings" })).toBeHidden();

      await page.reload();

      await page.getByRole("button", { name: "Settings" }).click();
      await page.getByRole("button", { name: "LLM API" }).click();
      expect(await modelInput.inputValue()).toBe(testModel);

      await modelInput.fill("gpt-4o-mini");
      await page.getByRole("button", { name: "Save Changes" }).click();
    });

    test("Prompt Template persists after save and reload", async ({ page }) => {
      test.setTimeout(60000);
      await page.waitForLoadState('networkidle');

      await page.getByRole("button", { name: "Settings" }).click();
      await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();

      await page.getByRole("button", { name: "LLM API" }).click();

      const promptTextarea = page.locator("#llmPromptTemplate");
      const testPrompt = "Please provide a detailed definition of {{word}} with examples.";

      await promptTextarea.fill(testPrompt);
      expect(await promptTextarea.inputValue()).toBe(testPrompt);

      await page.getByRole("button", { name: "Save Changes" }).click();
      await expect(page.getByText("Settings saved").first()).toBeVisible();
      await expect(page.getByRole("dialog", { name: "Settings" })).toBeHidden();

      await page.reload();

      await page.getByRole("button", { name: "Settings" }).click();
      await page.getByRole("button", { name: "LLM API" }).click();
      expect(await promptTextarea.inputValue()).toBe(testPrompt);

      await promptTextarea.fill("Define the following word: {{word}}");
      await page.getByRole("button", { name: "Save Changes" }).click();
    });
  });

  test("Reset Defaults restores all settings to initial values", async ({ page }) => {
    test.setTimeout(60000);
    await page.waitForLoadState('networkidle');

    await page.getByRole("button", { name: "Settings" }).click();

    await page.getByRole("button", { name: "General" }).click();
    await page.getByLabel("Launch at Login").check();

    await page.getByRole("button", { name: "Timing" }).click();
    await page.locator("#popupInterval").fill("90");
    await page.locator("#autoDismiss").fill("50");

    await page.getByRole("button", { name: "Algorithm" }).click();
    await page.getByText("Leitner System").click();

    await page.getByRole("button", { name: "Database" }).click();
    await page.getByLabel("Remote (PostgreSQL)").check();
    await page.getByLabel("Host").fill("reset-test-host");
    await page.getByLabel("Port").fill("5444");

    await page.getByRole("button", { name: "LLM API" }).click();
    await page.getByPlaceholder("https://api.openai.com/v1/chat/completions").fill("https://reset.example.com");
    await page.getByPlaceholder("sk-...").fill("sk-reset-key");
    await page.getByPlaceholder("gpt-4o-mini").fill("gpt-3.5-turbo");
    await page.locator("#llmPromptTemplate").fill("Reset test prompt: {{word}}");

    await page.getByRole("button", { name: "Save Changes" }).click();
    await expect(page.getByText("Settings saved").first()).toBeVisible();

    await page.getByRole("button", { name: "Settings" }).click();

    await page.getByRole("button", { name: "General" }).click();
    expect(await page.getByLabel("Launch at Login").isChecked()).toBe(true);

    await page.getByRole("button", { name: "Reset Defaults" }).click();
    await expect(page.getByText("Settings reset").first()).toBeVisible();

    expect(await page.getByLabel("Launch at Login").isChecked()).toBe(false);

    await page.getByRole("button", { name: "Timing" }).click();
    expect(await page.locator("#popupInterval").inputValue()).toBe("25");
    expect(await page.locator("#autoDismiss").inputValue()).toBe("30");

    await page.getByRole("button", { name: "Algorithm" }).click();
    const sm2Radio = page.locator("input[type='radio']").first();
    expect(await sm2Radio.isChecked()).toBe(true);

    await page.getByRole("button", { name: "Database" }).click();
    expect(await page.getByLabel("Local (SQLite)").isChecked()).toBe(true);
    expect(await page.getByLabel("Host").inputValue()).toBe("localhost");
    expect(await page.getByLabel("Port").inputValue()).toBe("5432");

    await page.getByRole("button", { name: "LLM API" }).click();
    expect(await page.getByPlaceholder("https://api.openai.com/v1/chat/completions").inputValue()).toBe("");
    expect(await page.getByPlaceholder("sk-...").inputValue()).toBe("");
    expect(await page.getByPlaceholder("gpt-4o-mini").inputValue()).toBe("gpt-4o-mini");
    expect(await page.locator("#llmPromptTemplate").inputValue()).toBe("Define the following word: {{word}}");

    await page.getByRole("button", { name: "Cancel" }).click();
  });

  test("Cancel discards unsaved changes", async ({ page }) => {
    test.setTimeout(60000);
    await page.waitForLoadState('networkidle');

    await page.getByRole("button", { name: "Settings" }).click();

    await page.getByRole("button", { name: "General" }).click();
    const launchCheckbox = page.getByLabel("Launch at Login");
    const initialValue = await launchCheckbox.isChecked();
    await launchCheckbox.setChecked(!initialValue);

    await page.getByRole("button", { name: "Timing" }).click();
    const popupSlider = page.locator("#popupInterval");
    const initialPopupValue = await popupSlider.inputValue();
    await popupSlider.fill("90");

    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("dialog", { name: "Settings" })).toBeHidden();

    await page.getByRole("button", { name: "Settings" }).click();

    await page.getByRole("button", { name: "General" }).click();
    expect(await launchCheckbox.isChecked()).toBe(initialValue);

    await page.getByRole("button", { name: "Timing" }).click();
    expect(await popupSlider.inputValue()).toBe(initialPopupValue);

    await page.getByRole("button", { name: "Cancel" }).click();
  });
});
