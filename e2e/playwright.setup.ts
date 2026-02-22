import { test as setup } from '@playwright/test';

setup('cleanup: close any open modals', async ({ page }) => {
  // Close any open dialogs/modals
  await page.evaluate(() => {
    // Find close any and open dialogs
    const dialogs = document.querySelectorAll('[data-state="open"]');
    dialogs.forEach((el) => {
      const closeButton = el.querySelector('button[aria-label="Close"], button[data-state="closed"]');
      if (closeButton) {
        (closeButton as HTMLElement).click();
      }
    });
  });
  
  // Press Escape to close any open dialogs
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
});
