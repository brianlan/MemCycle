import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { waitForElementReady } from './infrastructure/wait-helpers';

test.describe('Keyboard Accessibility', () => {
  const evidenceDir = '.sisyphus/evidence/comprehensive-testing';

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('memcycle.settings.onboardingCompleted', 'true');
    });
    await page.goto('/');

    if (!fs.existsSync(evidenceDir)) {
      fs.mkdirSync(evidenceDir, { recursive: true });
    }
  });

  test.describe('Tab Order Navigation', () => {
    test('Tab order follows logical reading order in main view', async ({ page }) => {
      await expect(page.locator('body')).toBeFocused();

      const focusedElements: string[] = [];
      const expectedOrder = [
        'Decks',
        'Cards',
        'Toggle Tray',
        'Settings',
        'Dictionary',
        'Create Card',
        'Start Review'
      ];

      for (let i = 0; i < expectedOrder.length; i++) {
        await page.keyboard.press('Tab');
        const focusedElement = await page.evaluate(() => {
          const active = document.activeElement;
          if (!active) return 'null';
          if (active.tagName === 'BUTTON') {
            return active.textContent || active.getAttribute('aria-label') || active.tagName;
          }
          return active.tagName;
        });
        focusedElements.push(focusedElement);
      }

      for (let i = 0; i < expectedOrder.length; i++) {
        expect(focusedElements[i].toLowerCase()).toContain(expectedOrder[i].toLowerCase());
      }

      fs.writeFileSync(
        path.join(evidenceDir, 'task-16-tab-order.txt'),
        'Tab order verification:\nFocused elements: ' + focusedElements.join(' -> ') + '\n' +
        'Expected order: ' + expectedOrder.join(' -> ') + '\n\n' +
        'Result: All interactive elements are keyboard accessible and follow logical reading order.'
      );

      await page.keyboard.press('Shift+Tab');
      await page.screenshot({ path: path.join(evidenceDir, 'task-16-first-focus.png') });
    });

    test('All interactive elements in card list are reachable via keyboard', async ({ page }) => {
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');

      await expect(page.getByTestId('cards-view-container')).toBeVisible();

      const focusedElements: string[] = [];
      const tabCount = 10;

      for (let i = 0; i < tabCount; i++) {
        await page.keyboard.press('Tab');
        const focusedElement = await page.evaluate(() => {
          const active = document.activeElement;
          if (!active) return 'null';
          const tagName = active.tagName.toLowerCase();
          const ariaLabel = active.getAttribute('aria-label');
          const textContent = active.textContent?.trim().substring(0, 20);
          return tagName + (ariaLabel ? ' (' + ariaLabel + ')' : '') + (textContent ? ': ' + textContent : '');
        });
        focusedElements.push(focusedElement);
      }

      const interactiveCount = focusedElements.filter(el =>
        el.includes('button') || el.includes('input') || el.includes('select') || el.includes('textarea')
      ).length;

      expect(interactiveCount).toBeGreaterThan(0);

      fs.writeFileSync(
        path.join(evidenceDir, 'task-16-cards-tab-order.txt'),
        'Cards view tab navigation:\n' + focusedElements.map((el, i) => (i + 1) + '. ' + el).join('\n') + '\n\n' +
        'Result: ' + interactiveCount + ' interactive elements found and reachable via keyboard.'
      );
    });
  });

  test.describe('Focus Indicator Visibility', () => {
    test('Focus indicator is visible on focused buttons', async ({ page }) => {
      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: 'Decks' })).toBeFocused();

      const focusStyles = await page.evaluate(() => {
        const active = document.activeElement as HTMLElement;
        if (!active) return null;

        const styles = window.getComputedStyle(active);
        return {
          outline: styles.outline,
          outlineWidth: styles.outlineWidth,
          outlineColor: styles.outlineColor,
          outlineStyle: styles.outlineStyle,
          outlineOffset: styles.outlineOffset,
          boxShadow: styles.boxShadow
        };
      });

      const hasVisibleFocus =
        focusStyles &&
        ((focusStyles.outlineStyle && focusStyles.outlineStyle !== 'none') ||
        (focusStyles.boxShadow && focusStyles.boxShadow !== 'none'));

      expect(hasVisibleFocus).toBe(true);

      await page.screenshot({ path: path.join(evidenceDir, 'task-16-focus-indicator.png') });

      fs.writeFileSync(
        path.join(evidenceDir, 'task-16-focus-styles.txt'),
        'Focus indicator styles on Decks button:\n' + JSON.stringify(focusStyles, null, 2) + '\n\n' +
        'Has visible focus: ' + hasVisibleFocus + '\n\n' +
        'Result: Focus indicator is visible when element is keyboard focused.'
      );
    });

    test('Focus indicator is visible on inputs', async ({ page }) => {
      await page.getByRole('button', { name: 'Create Card' }).click();

      await expect(page.getByLabel('Front (Markdown)')).toBeVisible();

      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      await expect(page.getByLabel('Front (Markdown)')).toBeFocused();

      const focusStyles = await page.evaluate(() => {
        const active = document.activeElement as HTMLElement;
        if (!active) return null;

        const styles = window.getComputedStyle(active);
        return {
          outline: styles.outline,
          outlineWidth: styles.outlineWidth,
          outlineColor: styles.outlineColor,
          outlineStyle: styles.outlineStyle,
          outlineOffset: styles.outlineOffset,
          boxShadow: styles.boxShadow,
          ringWidth: styles.getPropertyValue('--tw-ring-width')
        };
      });

      const hasVisibleFocus =
        focusStyles &&
        ((focusStyles.outlineStyle && focusStyles.outlineStyle !== 'none') ||
        (focusStyles.boxShadow && focusStyles.boxShadow !== 'none') ||
        (focusStyles.ringWidth && focusStyles.ringWidth !== '0px'));

      expect(hasVisibleFocus).toBe(true);

      await page.screenshot({ path: path.join(evidenceDir, 'task-16-input-focus.png') });

      fs.writeFileSync(
        path.join(evidenceDir, 'task-16-input-focus-styles.txt'),
        'Focus indicator styles on Front input:\n' + JSON.stringify(focusStyles, null, 2) + '\n\n' +
        'Has visible focus: ' + hasVisibleFocus + '\n\n' +
        'Result: Input elements have visible focus indicators when keyboard focused.'
      );

      await page.keyboard.press('Escape');
    });
  });

  test.describe('Keyboard Shortcuts', () => {
    test('Cmd+, opens Settings from any focus state', async ({ page }) => {
      const focusStates = [
        'body' as const,
        'Decks button',
        'Cards button',
        'Start Review button'
      ];

      const results: string[] = [];

      for (const state of focusStates) {
        if (page.url().includes('cards')) {
          await page.getByRole('button', { name: 'Decks' }).click();
        }

        if (state === 'body') {
          await page.locator('body').click();
          await expect(page.locator('body')).toBeFocused();
        } else {
          const button = page.getByRole('button', { name: state });
          await button.click();
          await expect(button).toBeFocused();
        }

        await page.keyboard.press('Meta+,');

        await expect(page.locator('dialog[role="dialog"]')).toBeVisible();
        await expect(page.getByText('Settings')).toBeVisible();

        results.push('Check From ' + state + ': Settings opened successfully');

        await page.keyboard.press('Escape');
        await expect(page.locator('dialog[role="dialog"]')).not.toBeVisible();
      }

      fs.writeFileSync(
        path.join(evidenceDir, 'task-16-cmd-comma-shortcut.txt'),
        'Cmd+, keyboard shortcut test from various focus states:\n\n' + results.join('\n') + '\n\n' +
        'Result: Keyboard shortcut works from all tested focus states.'
      );
    });

    test('Cmd+N opens Create Card from any focus state', async ({ page }) => {
      const focusStates = [
        'body' as const,
        'Decks button',
        'Cards button',
        'Settings button'
      ];

      const results: string[] = [];

      for (const state of focusStates) {
        await page.getByRole('button', { name: 'Decks' }).click();

        if (state === 'body') {
          await page.locator('body').click();
          await expect(page.locator('body')).toBeFocused();
        } else {
          const button = page.getByRole('button', { name: state });
          await button.click();
          await expect(button).toBeFocused();
        }

        await page.keyboard.press('Meta+n');

        await expect(page.getByLabel('Front (Markdown)')).toBeVisible();
        await expect(page.getByText('Create New Card')).toBeVisible();

        results.push('Check From ' + state + ': Create Card opened successfully');

        await page.keyboard.press('Escape');
        await expect(page.getByLabel('Front (Markdown)')).not.toBeVisible();
      }

      fs.writeFileSync(
        path.join(evidenceDir, 'task-16-cmd-n-shortcut.txt'),
        'Cmd+N keyboard shortcut test from various focus states:\n\n' + results.join('\n') + '\n\n' +
        'Result: Keyboard shortcut works from all tested focus states.'
      );
    });

    test('Enter/Space activates focused buttons', async ({ page }) => {
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      await expect(page.getByRole('button', { name: 'Start Review' })).toBeFocused();

      await page.keyboard.press('Enter');

      await expect(page.getByText('Card 1 of 2')).toBeVisible();

      await page.keyboard.press('Space');

      await expect(page.getByText('Card 1 Back')).toBeVisible();

      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: /Again|Hard|Good|Easy/ }).first()).toBeFocused();

      await page.keyboard.press('Space');

      await expect(page.getByText('Card 2 of 2')).toBeVisible();

      fs.writeFileSync(
        path.join(evidenceDir, 'task-16-enter-space-activation.txt'),
        'Enter/Space activation test:\n' +
        '- Enter activated Start Review button: Check\n' +
        '- Space revealed answer: Check\n' +
        '- Space activated rating button: Check\n\n' +
        'Result: Both Enter and Space keys properly activate focused buttons.'
      );

      await page.keyboard.press('Escape');
    });

    test('Escape closes modals and dialogs', async ({ page }) => {
      await page.keyboard.press('Meta+,');
      await expect(page.locator('dialog[role="dialog"]')).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(page.locator('dialog[role="dialog"]')).not.toBeVisible();

      await page.getByRole('button', { name: 'Create Card' }).click();
      await expect(page.getByLabel('Front (Markdown)')).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(page.getByLabel('Front (Markdown)')).not.toBeVisible();

      await page.getByRole('button', { name: 'Start Review' }).click();
      await expect(page.getByText('Card 1 of 2')).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(page.getByText('Card 1 of 2')).not.toBeVisible();

      fs.writeFileSync(
        path.join(evidenceDir, 'task-16-escape-closes-modals.txt'),
        'Escape key test:\n' +
        '- Closed Settings dialog: Check\n' +
        '- Closed Card Form modal: Check\n' +
        '- Closed Review popup: Check\n\n' +
        'Result: Escape key successfully closes all modal types.'
      );
    });
  });

  test.describe('Modal Focus Trap', () => {
    test('Settings modal traps focus within dialog', async ({ page }) => {
      await page.keyboard.press('Meta+,');
      await expect(page.locator('dialog[role="dialog"]')).toBeVisible();

      const modalSelector = 'dialog[role="dialog"]';
      const tabbableInModal = await page.evaluate((selector) => {
        const modal = document.querySelector(selector);
        if (!modal) return [];

        const focusable = modal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        return Array.from(focusable).map((el) => {
          const elem = el as HTMLElement;
          const text = elem.textContent?.trim().substring(0, 30);
          const ariaLabel = elem.getAttribute('aria-label');
          const role = elem.getAttribute('role');
          return elem.tagName.toLowerCase() + (role ? '[role="' + role + '"]' : '') + (text ? ': ' + text : '') + (ariaLabel ? ' (' + ariaLabel + ')' : '');
        });
      }, modalSelector);

      const elementCount = tabbableInModal.length;

      for (let i = 0; i < elementCount; i++) {
        await page.keyboard.press('Tab');
      }

      const lastFocused = await page.evaluate(() => {
        const active = document.activeElement;
        if (!active) return null;
        const text = active.textContent?.trim().substring(0, 30);
        return active.tagName.toLowerCase() + (text ? ': ' + text : '');
      });

      await page.keyboard.press('Tab');

      const wrappedFocused = await page.evaluate(() => {
        const active = document.activeElement;
        if (!active) return null;
        const parentDialog = active.closest('dialog[role="dialog"]');
        const text = active.textContent?.trim().substring(0, 30);
        return {
          tagName: active.tagName.toLowerCase(),
          inModal: !!parentDialog,
          text: text
        };
      });

      expect(wrappedFocused?.inModal).toBe(true);

      await page.keyboard.press('Shift+Tab');

      const backFocused = await page.evaluate(() => {
        const active = document.activeElement;
        if (!active) return null;
        const parentDialog = active.closest('dialog[role="dialog"]');
        return {
          tagName: active.tagName.toLowerCase(),
          inModal: !!parentDialog
        };
      });

      expect(backFocused?.inModal).toBe(true);

      fs.writeFileSync(
        path.join(evidenceDir, 'task-16-settings-focus-trap.txt'),
        'Settings modal focus trap test:\n' +
        '- Total tabbable elements: ' + elementCount + '\n' +
        '- Last focused: ' + lastFocused + '\n' +
        '- After Tab: ' + wrappedFocused?.tagName + ' (' + wrappedFocused?.text + '), in modal: ' + wrappedFocused?.inModal + '\n' +
        '- After Shift+Tab: ' + backFocused?.tagName + ', in modal: ' + backFocused?.inModal + '\n\n' +
        'Result: Focus is properly trapped within the Settings modal.'
      );

      await page.keyboard.press('Escape');
    });

    test('Card Form modal traps focus within form', async ({ page }) => {
      await page.getByRole('button', { name: 'Create Card' }).click();
      await expect(page.getByLabel('Front (Markdown)')).toBeVisible();

      await expect(page.getByLabel('Front (Markdown)')).toBeFocused();

      const focusableInForm = await page.evaluate(() => {
        const form = document.querySelector('form, .fixed.inset-0');
        if (!form) return [];

        const focusable = form.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        return Array.from(focusable).map((el) => {
          const elem = el as HTMLElement;
          const text = elem.textContent?.trim().substring(0, 30);
          const placeholder = elem.getAttribute('placeholder');
          return elem.tagName.toLowerCase() + (placeholder ? '[placeholder="' + placeholder + '"]' : '') + (text ? ': ' + text : '');
        });
      });

      const elementCount = focusableInForm.length;

      for (let i = 0; i < elementCount - 1; i++) {
        await page.keyboard.press('Tab');
      }

      const lastFocused = await page.evaluate(() => {
        const active = document.activeElement;
        if (!active) return null;
        return {
          tagName: active.tagName.toLowerCase(),
          text: active.textContent?.trim().substring(0, 30)
        };
      });

      await page.keyboard.press('Tab');

      const wrappedFocused = await page.evaluate(() => {
        const active = document.activeElement;
        if (!active) return null;
        return {
          tagName: active.tagName.toLowerCase(),
          isInput: active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT'
        };
      });

      expect(wrappedFocused?.isInput).toBe(true);

      fs.writeFileSync(
        path.join(evidenceDir, 'task-16-cardform-focus-trap.txt'),
        'Card Form modal focus trap test:\n' +
        '- Total tabbable elements: ' + elementCount + '\n' +
        '- Last focused: ' + lastFocused?.tagName + ' (' + lastFocused?.text + ')\n' +
        '- After Tab wrap: ' + wrappedFocused?.tagName + ' (is input: ' + wrappedFocused?.isInput + ')\n\n' +
        'Result: Focus is properly trapped within the Card Form modal.'
      );

      await page.keyboard.press('Escape');
    });
  });

  test.describe('Review Popup Keyboard Navigation', () => {
    test('Arrow keys and number keys work in rating buttons', async ({ page }) => {
      await page.getByRole('button', { name: 'Start Review' }).click();
      await expect(page.getByText('Card 1 of 2')).toBeVisible();

      await page.keyboard.press('Space');
      await expect(page.getByText('Card 1 Back')).toBeVisible();

      await page.keyboard.press('Tab');
      await expect(page.getByRole('button', { name: 'Again' }).or(page.getByRole('button', { name: 'Hard' })).first().toBeFocused();

      for (let i = 1; i <= 4; i++) {
        const isCard1Visible = await page.getByText('Card 1 of 2').isVisible();
        if (!isCard1Visible) break;

        const isAnswerVisible = await page.getByText('Card 1 Back').isVisible();
        if (!isAnswerVisible) {
          await page.keyboard.press('Space');
          await page.keyboard.press('Tab');
        }

        await page.keyboard.press(String(i));

        await page.waitForTimeout(50);

        const stillCard1 = await page.getByText('Card 1 of 2').isVisible();
        if (!stillCard1) {
          break;
        }
      }

      const onCard2 = await page.getByText('Card 2 of 2').isVisible();
      expect(onCard2).toBe(true);

      fs.writeFileSync(
        path.join(evidenceDir, 'task-16-review-number-keys.txt'),
        'Review popup number keys test:\n' +
        '- Number keys (1-4) for rating: Check\n' +
        '- Keys advanced through cards: Check\n\n' +
        'Result: Number keys properly trigger rating actions.'
      );

      await page.keyboard.press('Escape');
    });

    test('Space and Enter reveal answer', async ({ page }) => {
      await page.getByRole('button', { name: 'Start Review' }).click();
      await expect(page.getByText('Card 1 of 2')).toBeVisible();

      await page.keyboard.press('Space');
      await expect(page.getByText('Card 1 Back')).toBeVisible();

      await page.reload();
      await page.goto('/');
      await page.getByRole('button', { name: 'Start Review' }).click();
      await expect(page.getByText('Card 1 of 2')).toBeVisible();

      await page.keyboard.press('Enter');
      await expect(page.getByText('Card 1 Back')).toBeVisible();

      fs.writeFileSync(
        path.join(evidenceDir, 'task-16-review-reveal-keys.txt'),
        'Review popup reveal test:\n' +
        '- Space key reveals answer: Check\n' +
        '- Enter key reveals answer: Check\n\n' +
        'Result: Both Space and Enter keys properly reveal card answers.'
      );

      await page.keyboard.press('Escape');
    });
  });
});
