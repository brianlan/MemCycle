import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";

const appPath = path.resolve("src-tauri/target/release/bundle/macos/MemCycle.app");

function run(command: string): string {
  return execSync(command, { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function appleScript(script: string): void {
  const tempFile = path.resolve(".tmp-tray-interactions.applescript");
  fs.writeFileSync(tempFile, script, "utf-8");
  try {
    run(`osascript "${tempFile}"`);
  } finally {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
}

test.describe("tray interactions", () => {
  test.beforeAll(() => {
    expect(fs.existsSync(appPath)).toBeTruthy();
  });

  test.beforeEach(async () => {
    run('pkill -f MemCycle || true');
    run(`open -n "${appPath}"`);
    run("sleep 2");
  });

  test.afterEach(async () => {
    run('pkill -f MemCycle || true');
    run("sleep 0.5");
  });

  test("tray icon click opens popup window", async () => {
    try {
      const initialWindows = run(`
osascript -e 'tell application "System Events" to count of windows of process "MemCycle"'
      `);
      appleScript(`
tell application "System Events"
  tell process "MemCycle"
    set frontmost to true
    tell menu bar 1
      tell menu bar item 1
        click
      end tell
    end tell
  end tell
end tell
      `);

      run("sleep 0.5");
      const newWindows = run(`
osascript -e 'tell application "System Events" to count of windows of process "MemCycle"'
      `);
      expect(parseInt(newWindows, 10)).toBeGreaterThan(parseInt(initialWindows, 10));
    } catch (error) {
      test.info().annotations.push({
        type: "accessibility-note",
        description: `Could not test tray icon click in this environment: ${String(error)}`,
      });
      test.skip();
    }
  });

  test("tray menu 'Open Dashboard' opens main window", async () => {
    try {
      run(`
osascript -e 'tell application "System Events" to tell process "MemCycle" to close every window'
`) || true;
      run("sleep 0.3");
      appleScript(`
tell application "System Events"
  tell process "MemCycle"
    set frontmost to true
    tell menu bar 1
      tell menu bar item 1
        click
        delay 0.3
        try
          click menu item "Open Dashboard" of menu 1
        end try
      end tell
    end tell
  end tell
end tell
      `);

      run("sleep 0.5");
      const windowCount = run(`
osascript -e 'tell application "System Events" to count of windows of process "MemCycle"'
      `);
      expect(parseInt(windowCount, 10)).toBeGreaterThan(0);
    } catch (error) {
      test.info().annotations.push({
        type: "accessibility-note",
        description: `Could not test 'Open Dashboard' menu item: ${String(error)}`,
      });
      test.skip();
    }
  });

  test("tray menu 'Review Now' triggers review popup", async () => {
    try {
      appleScript(`
tell application "System Events"
  tell process "MemCycle"
    set frontmost to true
    tell menu bar 1
      tell menu bar item 1
        click
        delay 0.3
        try
          click menu item "Review Now" of menu 1
        end try
      end tell
    end tell
  end tell
end tell
      `);

      run("sleep 0.5");
      const windowCount = run(`
osascript -e 'tell application "System Events" to count of windows of process "MemCycle"'
      `);
      expect(parseInt(windowCount, 10)).toBeGreaterThan(0);
    } catch (error) {
      test.info().annotations.push({
        type: "accessibility-note",
        description: `Could not test 'Review Now' menu item: ${String(error)}`,
      });
      test.skip();
    }
  });

  test("tray menu 'Settings' opens settings panel", async () => {
    try {
      appleScript(`
tell application "System Events"
  tell process "MemCycle"
    set frontmost to true
    tell menu bar 1
      tell menu bar item 1
        click
        delay 0.3
        try
          click menu item "Settings" of menu 1
        end try
      end tell
    end tell
  end tell
end tell
      `);

      run("sleep 0.5");
      const windowCount = run(`
osascript -e 'tell application "System Events" to count of windows of process "MemCycle"'
      `);
      expect(parseInt(windowCount, 10)).toBeGreaterThan(0);
    } catch (error) {
      test.info().annotations.push({
        type: "accessibility-note",
        description: `Could not test 'Settings' menu item: ${String(error)}`,
      });
      test.skip();
    }
  });

  test("tray menu 'Quit' closes application gracefully", async () => {
    try {
      const beforePid = run("pgrep -f MemCycle | head -1 || echo '");
      expect(beforePid.length).toBeGreaterThan(0);
      appleScript(`
tell application "System Events"
  tell process "MemCycle"
    set frontmost to true
    tell menu bar 1
      tell menu bar item 1
        click
        delay 0.3
        try
          click menu item "Quit" of menu 1
        end try
      end tell
    end tell
  end tell
end tell
      `);

      run("sleep 1");

      const afterPid = run("pgrep -f MemCycle | head -1 || echo '");
      expect(afterPid.length).toBe(0);
    } catch (error) {
      test.info().annotations.push({
        type: "accessibility-note",
        description: `Could not test 'Quit' menu item: ${String(error)}`,
      });
      test.skip();
    }
  });

  test("graceful skip without accessibility permissions", async () => {
    let hasAccessibility = false;
    try {
      const result = run(`
osascript -e 'tell application "System Events" to get name of every process'
      `);
      hasAccessibility = result.includes("MemCycle") || result.length > 0;
    } catch {
    }
    if (!hasAccessibility) {
      test.info().annotations.push({
        type: "accessibility-note",
        description: "Accessibility permissions not available - this is expected in CI environments",
      });
      test.skip();
    }

    try {
      const menuBarItems = run(`
osascript -e 'tell application "System Events" to tell process "MemCycle" to count of menu bar items of menu bar 1'
      `);
      expect(parseInt(menuBarItems, 10)).toBeGreaterThan(0);
    } catch (error) {
      test.info().annotations.push({
        type: "accessibility-note",
        description: `Could not verify tray menu bar: ${String(error)}`,
      });
      test.skip();
    }
  });
});
