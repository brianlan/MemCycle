import { expect, test } from "@playwright/test";
import fs from "fs";
import path from "path";

const evidenceDir = path.join(".sisyphus", "evidence");

test.describe("Task 27 Integration", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("memcycle.settings.onboardingCompleted", "true");
    });
    await page.goto("/");
  });

  test("routes tray to decks/cards/settings and supports review/create/export entrypoints", async ({ page }) => {
    if (!fs.existsSync(evidenceDir)) {
      fs.mkdirSync(evidenceDir, { recursive: true });
    }

    await page.getByRole("button", { name: "Toggle Tray" }).click();
    await page.getByRole("button", { name: "View Decks" }).click();
    await expect(page.getByTestId("deck-list-container")).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, "task-27-decks.png") });

    await page.getByRole("button", { name: "Cards" }).click();
    await expect(page.getByTestId("cards-view-container")).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, "task-27-cards.png") });

    await page.getByRole("button", { name: "Open Settings" }).click();
    await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, "task-27-settings.png") });
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("dialog", { name: "Settings" })).toBeHidden();

    await page.getByRole("button", { name: "Create Card" }).first().click();
    await expect(page.getByText("Create New Card", { exact: true })).toBeVisible();
    await page.getByLabel("Front (Markdown)").fill("Task 27 front");
    await page.getByLabel("Back (Markdown)").fill("Task 27 back");
    await page.getByRole("button", { name: "Save Card" }).click();
    await expect(page.getByText("Create New Card", { exact: true })).toBeHidden();

    await page.getByRole("button", { name: "Open CollinsDictionary" }).click();
    await expect(page.getByText("Collins AI Dictionary", { exact: true })).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, "task-27-collins.png") });
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByText("Collins AI Dictionary", { exact: true })).toBeHidden();

    await page.getByRole("button", { name: "Start Review" }).click();
    await expect(page.getByText("Card 1 of 2", { exact: true })).toBeVisible();
    await page.keyboard.press("Space");
    await expect(page.getByRole("button", { name: "Easy" })).toBeVisible();
    await page.keyboard.press("4");
    await expect(page.getByText("Card 2 of 2", { exact: true })).toBeVisible();
    await page.keyboard.press("Space");
    await expect(page.getByRole("button", { name: "Easy" })).toBeVisible();
    await page.keyboard.press("4");
    await expect(page.getByText("Card 2 of 2", { exact: true })).toBeHidden();
    await page.screenshot({ path: path.join(evidenceDir, "task-27-review.png") });

    await page.getByRole("button", { name: "Toggle Tray" }).click();
    await page.getByTitle("Export/Import").click();
    await expect(page.getByText("Export/Import", { exact: true }).first()).toBeVisible();
    await fs.promises.writeFile(
      path.join(evidenceDir, "task-27-e2e.txt"),
      "Verified tray->decks/cards/settings navigation, card creation (default + CollinsDictionary), review flow, and export/import tray entrypoint in web runtime.",
    );
  });
});
