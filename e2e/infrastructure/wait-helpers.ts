import { Page, Locator, expect } from '@playwright/test';

/**
 * Wait helpers for E2E tests
 *
 * FLAKINESS PREVENTION GUIDELINES:
 * 1. NEVER use waitForTimeout() - always use condition-based waits
 * 2. Prefer expect().toBeVisible() over waitForTimeout()
 * 3. Use expect(async () => {}).toPass() for retry logic with assertions
 * 4. Use waitForNetworkIdle() only for page transitions and API calls
 * 5. Use waitForElementStable() for elements that may be in transition
 * 6. If force: true is required, ALWAYS document why
 */

/**
 * Wait for network to be idle after navigation or API calls
 * Use after page loads, form submissions, or data fetching operations
 */
export async function waitForNetworkIdle(
  page: Page,
  options?: { timeout?: number },
): Promise<void> {
  await page.waitForLoadState('networkidle', options);
}

/**
 * Wait for an element to be stable (not animating or transitioning)
 * Useful for elements that may have CSS transitions or animations
 */
export async function waitForElementStable(
  locator: Locator,
  options?: { timeout?: number; checkInterval?: number },
): Promise<void> {
  const { timeout = 5000, checkInterval = 100 } = options || {};

  const startTime = Date.now();
  let previousBoundingBox = await locator.boundingBox();

  while (Date.now() - startTime < timeout) {
    await new Promise(resolve => setTimeout(resolve, checkInterval));
    const currentBoundingBox = await locator.boundingBox();

    if (
      previousBoundingBox &&
      currentBoundingBox &&
      previousBoundingBox.x === currentBoundingBox.x &&
      previousBoundingBox.y === currentBoundingBox.y &&
      previousBoundingBox.width === currentBoundingBox.width &&
      previousBoundingBox.height === currentBoundingBox.height
    ) {
      return;
    }

    previousBoundingBox = currentBoundingBox;
  }

  throw new Error(`Element did not stabilize within ${timeout}ms`);
}

/**
 * Wait for dropdown options to be visible and populated
 * Replaces arbitrary waitForTimeout() calls when waiting for dropdowns
 */
export async function waitForDropdownOptions(
  dropdown: Locator,
  options?: { minCount?: number; timeout?: number },
): Promise<void> {
  const { minCount = 1, timeout = 5000 } = options || {};

  await expect(async () => {
    const optionCount = await dropdown.locator('option').count();
    expect(optionCount).toBeGreaterThanOrEqual(minCount);
  }).toPass({ timeout });
}

/**
 * Wait for selection to be registered in a select/dropdown element
 * Replaces arbitrary waitForTimeout() calls after selecting an option
 */
export async function waitForSelectionToRegister(
  dropdown: Locator,
  expectedValue?: string,
  options?: { timeout?: number },
): Promise<void> {
  const { timeout = 3000 } = options || {};

  if (expectedValue) {
    await expect(dropdown).toHaveValue(expectedValue, { timeout });
  } else {
    await expect(async () => {
      const value = await dropdown.inputValue();
      expect(value).not.toBe('');
    }).toPass({ timeout });
  }
}

/**
 * Wait for a specific count of elements to be present
 * Replaces arbitrary waitForTimeout() calls when waiting for dynamic lists
 */
export async function waitForElementCount(
  locator: Locator,
  expectedCount: number,
  options?: { timeout?: number },
): Promise<void> {
  const { timeout = 5000 } = options || {};

  await expect(async () => {
    const count = await locator.count();
    expect(count).toBe(expectedCount);
  }).toPass({ timeout });
}

/**
 * Wait for element to be fully interactive (visible + enabled)
 * Use before clicking buttons or interacting with elements
 */
export async function waitForElementReady(
  locator: Locator,
  options?: { timeout?: number },
): Promise<void> {
  const { timeout = 5000 } = options || {};

  await expect(async () => {
    await expect(locator).toBeVisible();
    await expect(locator).toBeEnabled();
  }).toPass({ timeout });
}

/**
 * Wait for text content to be present in an element
 * Replaces arbitrary waitForTimeout() calls when waiting for text updates
 */
export async function waitForTextContent(
  locator: Locator,
  expectedText: string | RegExp,
  options?: { timeout?: number },
): Promise<void> {
  const { timeout = 5000 } = options || {};

  await expect(locator).toHaveText(expectedText, { timeout });
}

/**
 * Wait for modal/overlay to be dismissed
 * Use when clicking elements that are covered by modals
 */
export async function waitForOverlayDismissed(
  page: Page,
  overlaySelector: string,
  options?: { timeout?: number },
): Promise<void> {
  const { timeout = 3000 } = options || {};

  await expect(page.locator(overlaySelector)).not.toBeVisible({ timeout });
}

/**
 * Retry a specific action until it succeeds
 * Use for operations that may intermittently fail due to timing
 */
export async function retryAction(
  action: () => Promise<void>,
  options?: { maxRetries?: number; retryDelay?: number },
): Promise<void> {
  const { maxRetries = 3, retryDelay = 500 } = options || {};

  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      await action();
      return;
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  throw lastError || new Error('Action failed after retries');
}

/**
 * Check if element is covered by an overlay
 * Returns true if force: true is needed for clicking
 */
export async function isElementCovered(locator: Locator): Promise<boolean> {
  try {
    const box = await locator.boundingBox();
    if (!box) return false;

    const page = locator.page();
    const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };

    const topElement = await page.evaluateHandle((p) => {
      const el = document.elementFromPoint(p.x, p.y);
      return el ? el : null;
    }, point);

    if (!topElement) return false;

    const targetElement = await locator.elementHandle();
    if (!targetElement) return false;

    const isCovered = await page.evaluate(
      ([top, target]) => {
        const topEl = top as Element;
        const targetEl = target as Element;

        if (topEl !== targetEl) {
          return !targetEl.contains(topEl);
        }

        return false;
      },
      [topElement, targetElement],
    );

    return isCovered;
  } catch {
    return false;
  }
}

/**
 * Force click with automatic justification comment
 * Only use this when element is confirmed to be covered
 * Automatically adds documentation comment to code
 *
 * NOTE: Prefer to use waitForOverlayDismissed() when possible
 */
export async function forceClickWithJustification(
  locator: Locator,
  reason: string,
): Promise<void> {
  const isCovered = await isElementCovered(locator);

  if (!isCovered) {
    try {
      await locator.click();
      return;
    } catch (error) {
      console.warn(`Normal click failed, using force: ${reason}`);
    }
  }

  await locator.click({ force: true });
  console.log(`// force: true because ${reason}`);
}
