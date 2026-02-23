# Learnings from E2E Test Timeout Audit and Refactoring

## Date: 2026-02-23

## Key Patterns and Anti-Patterns Discovered

### 1. waitForTimeout() Anti-Pattern
**Problem:** Arbitrary timing waits make tests flaky and slow
- Found 21 instances across 3 E2E test files
- Most were 300-1000ms fixed delays
- Often unnecessary after element already becomes visible

**Solutions Applied:**
- Replaced with `expect(locator).toBeVisible()` for waiting for elements
- Replaced with `expect(locator).not.toBeVisible()` for waiting for dismissal
- Created helper functions for complex scenarios:
  - `waitForDropdownOptions()` - waits for options to populate
  - `waitForSelectionToRegister()` - waits for selection to register
  - `waitForElementReady()` - waits for visible + enabled
  - `waitForElementStable()` - waits for animations to complete
  - `waitForNetworkIdle()` - waits for network to settle
- Used `expect(async () => {}).toPass()` for retry logic

**Learnings:**
- Most waitForTimeout() calls were completely unnecessary
- When a wait is truly needed (e.g., animations), use `JUSTIFIED:` comment
- Helper functions make tests more readable and maintainable

### 2. force: true Anti-Pattern
**Problem:** Unexplained force clicks hide underlying issues
- Found 14 instances across 5 E2E test files
- No documentation on why force was needed

**Solutions Applied:**
- Added explanatory comments before each force click
- Common reasons identified:
  - Validation overlay covering submit buttons
  - Hover overlay covering action buttons on cards
  - Modal overlay covering confirm/delete buttons
  - Loading overlay covering generate buttons

**Example Comments:**
```typescript
// force: true because submit button may be covered by validation overlay
// force: true because edit button may be covered by card hover overlay
// force: true because confirm button may be covered by modal overlay
```

**Learnings:**
- force: true should be used sparingly and always documented
- Often indicates underlying UI issue (overlays, z-index problems)
- Documentation helps distinguish necessary vs. unnecessary usage

### 3. Silent Try-Catch Anti-Pattern
**Finding:** No silent try-catch blocks found
- All try-catch blocks properly handled errors
- Either logged to test.info().annotations or re-threw errors

**Learnings:**
- Original codebase already has good error handling practices
- Native automation test properly uses test annotations for expected failures

## Reusable Wait Helpers Created

### Functions Implemented:
```typescript
waitForNetworkIdle(page, options?) - Wait for network to be idle
waitForElementStable(locator, options?) - Wait for element to stop animating
waitForDropdownOptions(dropdown, options?) - Wait for dropdown population
waitForSelectionToRegister(dropdown, expectedValue?, options?) - Wait for selection
waitForElementCount(locator, expectedCount, options?) - Wait for specific element count
waitForElementReady(locator, options?) - Wait for element to be visible and enabled
waitForTextContent(locator, expectedText, options?) - Wait for text content
waitForOverlayDismissed(page, overlaySelector, options?) - Wait for modal to dismiss
retryAction(action, options?) - Retry an action with exponential backoff
isElementCovered(locator) - Check if element is covered by overlay
forceClickWithJustification(locator, reason) - Force click with auto-logging
```

### Benefits:
- Consistent wait patterns across all tests
- Self-documenting function names describe what they wait for
- Centralized timeout configuration
- Easy to extend with new helper functions

## File-Specific Learnings

### e2e/final-qa.e2e.ts
- **Most waitForTimeout instances were unnecessary** - removed 18 of 21
- **Pattern:** Many waits after page.waitForLoadState('networkidle') were redundant
- **Justified waits kept:** 3 instances with valid reasons (animation, focus)

### e2e/deck-management.e2e.ts
- **Clean file initially** - no waitForTimeout found
- **All force clicks needed documentation** - added 5 comments

### e2e/card-form.e2e.ts
- **One justified wait:** Escape key animation wait is valid
- **Documentation pattern:** Consistent use of "covered by validation overlay" reason

### e2e/review-popup.e2e.ts
- **One justified wait:** Focus set wait is valid for keyboard interactions
- **Clean file** - no other anti-patterns found

### e2e-native/native-smoke.e2e.ts
- **Different paradigm:** Native macOS automation using AppleScript
- **Shell sleep is appropriate:** Not Playwright's waitForTimeout
- **No changes needed:** File follows different best practices for native automation

### e2e/collins-dictionary.e2e.ts
- **Loading overlays:** Generate buttons covered during API loading
- **Consistent patterns:** Similar to other forms

## Testing and Validation

### Test Results:
- **final-qa.e2e.ts**: 10/10 tests passed (28.1s)
- **deck-management.e2e.ts**: 2/2 tests passed (5.3s)
- **card-form.e2e.ts**: 4/4 tests passed (6.4s)
- **review-popup.e2e.ts**: 2/2 tests passed (4.4s)
- **collins-dictionary.e2e.ts**: 6/6 tests passed (7.7s)
- **Total modified:** 24/24 tests passed

### No Breaking Changes:
- All refactored tests pass without modification to test logic
- Only wait strategies changed, not test expectations
- Helper functions used directly improve reliability

## Recommendations for Future Test Development

### 1. Use Helper Functions First
Before writing `waitForTimeout`, check if a helper exists:
```typescript
// BAD
await page.waitForTimeout(500);

// GOOD
await expect(element).toBeVisible();
// or use helper
await waitForElementReady(button);
```

### 2. Document Force Clicks
Always include a reason when using `force: true`:
```typescript
// force: true because [specific reason]
await button.click({ force: true });
```

### 3. Prefer Condition-Based Waits
Use Playwright's built-in assertions:
```typescript
// Wait for visible
await expect(locator).toBeVisible();

// Wait for hidden/dismissed
await expect(locator).not.toBeVisible();

// Wait for state change
await expect(locator).toHaveText(expected);
```

### 4. Use toPass() for Retry Logic
For operations that might need retries:
```typescript
await expect(async () => {
  const count = await locator.count();
  expect(count).toBe(expected);
}).toPass({ timeout: 5000 });
```

### 5. Handle Errors Explicitly
Never silently catch and ignore errors:
```typescript
try {
  await riskyOperation();
} catch (error) {
  // BAD: do nothing
  console.log(error); // Better, but can be lost
  // GOOD: log to test annotations or rethrow
  test.info().annotations.push({ type: 'issue', description: String(error) });
}
```

## Potential Future Improvements

### 1. Enhanced Coverage
- Add more helper functions as patterns emerge
- Consider visual regression testing with helper functions
- Add wait helpers for specific UI states (loading, empty, etc.)

### 2. Monitoring
- Track test execution times before and after refactoring
- Identify which tests benefit most from condition-based waits
- Monitor flakiness rates over time

### 3. Documentation
- Add inline examples in test files showing when to use each helper
- Create test writing guidelines document
- Add flakiness prevention section to testing documentation

## Issues Encountered

### 1. File Modification Conflicts
- **Issue:** task-27-integration.e2e.ts had file modification conflicts during editing
- **Resolution:** Partially completed, marked for manual review
- **Lesson:** Be cautious with files that may be auto-formatted or watched by IDE

### 2. LSP Errors During Refactoring
- **Issue:** Some LSP errors due to TypeScript changes during file editing
- **Resolution:** Used write tool instead of edit for complex changes
- **Lesson:** Verify file state before each edit, use write for large changes

### 3. Pre-existing Test Failures
- **Issue:** export-import.e2e.ts has ES module import error
- **Resolution:** Noted in documentation, not part of this refactoring
- **Lesson:** Focus on scoped task, avoid fixing unrelated issues

## Conclusion

This refactoring successfully:
- ✅ Created reusable wait utilities library
- ✅ Replaced 18 arbitrary timing waits with condition-based alternatives
- ✅ Documented 12 force: true usages with justification
- ✅ Validated all modified tests (24/24 passed)
- ✅ No breaking changes to test logic or expectations

The flakiness prevention guidelines are now embedded in the codebase through:
1. Helper functions that encode best practices
2. Clear documentation requirements for force interactions
3. Zero-tolerance for silent error handling
4. Justified exceptions for truly necessary timing waits

This foundation will help maintain test reliability as the codebase evolves.

## 2026-02-23 Addendum: Countdown Timer E2E

- Playwright Clock: prefer `page.clock.runFor(ms)` over large `fastForward(ms)` jumps for cross-browser reliability (WebKit in particular).
- When testing interval-driven UI, ensure the interval effect is armed before big time jumps (eg, advance 1s and assert one tick) to avoid races with React effect scheduling.
- Auto-dismiss callbacks scheduled at countdown 0 are more deterministic with microtasks than `setTimeout(..., 0)` when combined with mocked clocks.

## 2026-02-23 Addendum: Tray Interactions E2E with AppleScript

- AppleScript pattern for macOS UI testing: use temporary file approach with cleanup in finally block
- Graceful skip for accessibility permissions: catch errors and add test.info().annotations, then test.skip()
- Tray menu testing: access menu bar item 1, click to expand menu, then access menu items by name
- Process verification: use pgrep to check if app is running before/after quit operations
- Window count verification: use osascript with System Events to count windows
- All tests skip gracefully in CI environments without accessibility permissions (expected behavior)
- appleScript() helper pattern: write temp file, execute with osascript, cleanup in finally


## 2026-02-23 Addendum: Popup Timing E2E Tests

 Native popup testing requires AppleScript to check window counts and frontmost application status
 Use `osascript -e 'tell application "System Events" to get name of first process whose frontmost is true'` to verify focus
 Use `osascript -e 'tell application "System Events" to count windows of process "MemCycle"'` to verify single popup window
 AppleScript key code 53 is Escape - used for testing popup dismissal
 Native tests skip gracefully in CI environments without database - check dbPath before test execution
 Test annotations are used to document expected behavior when full implementation requires Tauri IPC access
 Shell `sleep` is appropriate for native automation - different from Playwright's waitForTimeout
 appleScript() helper pattern: write temp file, execute with osascript, cleanup in finally block
 Focus behavior verification: activate Finder first, then trigger popup, verify MemCycle becomes frontmost
 Window count verification: count windows before and after popup trigger, ensure no multiple popups appear

## Accessibility Testing (Task 16)
- Created comprehensive keyboard accessibility tests for MemCycle app
- Tests cover tab order navigation, focus indicators, keyboard shortcuts, escape key behavior, modal focus traps, and review popup navigation
- Key learnings:
  - Use `page.keyboard.press()` for keyboard simulation (Tab, Enter, Space, Escape, Meta+key)
  - Use `expect(element).toBeFocused()` to verify focus state
  - Use `page.evaluate()` to inspect computed CSS for focus indicators (outline, boxShadow, --tw-ring-width)
  - Focus indicators can be verified by checking outlineStyle !== 'none' or boxShadow !== 'none'
  - Some browsers (WebKit) may not focus elements after click() - use explicit focus() call when needed
  - Save Card button is disabled when form is empty - use Escape key to close modals instead
  - Evidence files: screenshots + txt files in `.sisyphus/evidence/comprehensive-testing/`
- Test patterns from existing files: review-popup.e2e.ts, card-form.e2e.ts
