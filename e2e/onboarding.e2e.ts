import { test, expect } from "@playwright/test";

test.describe("Onboarding Wizard", () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to simulate fresh install
    await page.goto("/");
    await page.evaluate(() => window.localStorage.clear());
  });

  test("completes full onboarding flow", async ({ page }) => {
    await page.goto("/");
    
    // Step 1: Welcome
    await expect(page.getByText("Welcome to MemCycle")).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();

    // Step 2: Deck Name
    await expect(page.getByRole("heading", { name: "Create your first Deck" })).toBeVisible();
    await page.getByPlaceholder("e.g., French Vocabulary").fill("My Cool Deck");
    await page.getByRole("button", { name: "Next" }).click();

    // Step 3: Card
    await expect(page.getByRole("heading", { name: "Add your first Card" })).toBeVisible();
    await page.getByPlaceholder("Question or term").fill("Hello");
    await page.getByPlaceholder("Answer or definition").fill("Bonjour");
    await page.getByRole("button", { name: "Next" }).click();

    // Step 4: Rhythm
    await expect(page.getByText("Set your Rhythm")).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();

    // Step 5: AI (Skip & Next)
    await expect(page.getByText("AI Assistant (Optional)")).toBeVisible();
    await page.getByRole("button", { name: "Skip & Next" }).click();

    // Step 6: Completion
    await expect(page.getByText("You're all set!")).toBeVisible();
    await page.getByRole("button", { name: "Get Started" }).click();

    // Verify wizard closed
    await expect(page.getByText("Welcome to MemCycle")).not.toBeVisible();

    // Take screenshot
    await page.screenshot({ path: ".sisyphus/evidence/task-26-onboarding.png" });

    // Reload and verify it doesn't reappear
    await page.reload();
    await expect(page.getByText("Welcome to MemCycle")).not.toBeVisible();
  });

  test("skips onboarding", async ({ page }) => {
    await page.goto("/");
    
    // Verify wizard is open
    await expect(page.getByText("Welcome to MemCycle")).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: ".sisyphus/evidence/task-26-skip.png" });

    // Click the X button (Skip)
    await page.getByLabel("Skip Onboarding").click();

    // Verify wizard closed
    await expect(page.getByText("Welcome to MemCycle")).not.toBeVisible();

    // Reload and verify it doesn't reappear
    await page.reload();
    await expect(page.getByText("Welcome to MemCycle")).not.toBeVisible();
  });
});
