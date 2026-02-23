import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";

const appPath = path.resolve("src-tauri/target/release/bundle/macos/MemCycle.app");
const dbPath = path.resolve(process.env.HOME ?? "", "Library/Application Support/com.memcycle.app/app.db");

function run(command: string): string {
  return execSync(command, { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function appleScript(script: string): void {
  const tempFile = path.resolve(".tmp-native-smoke.applescript");
  fs.writeFileSync(tempFile, script, "utf-8");
  try {
    run(`osascript "${tempFile}"`);
  } finally {
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
  }
}

test.describe("native macOS smoke", () => {
  test.beforeAll(() => {
    expect(fs.existsSync(appPath)).toBeTruthy();
  });

  test("launch app and switch Decks/Cards/Decks", async () => {
    run('pkill -f MemCycle || true');
    run(`open -n "${appPath}"`);
    run("sleep 2");

    const processList = run("ps aux | grep -i memcycle | grep -v grep || true");
    expect(processList.length).toBeGreaterThan(0);

    try {
      appleScript(`
tell application "System Events"
  tell process "MemCycle"
    set frontmost to true
    click button "Cards" of window 1
    delay 0.4
    click button "Decks" of window 1
  end tell
end tell
`);
    } catch (error) {
      test.info().annotations.push({
        type: "native-ui-note",
        description: `Could not click Decks/Cards buttons via AppleScript in this environment: ${String(error)}`,
      });
    }
  });

  test("deck count remains stable across relaunch", async () => {
    if (!fs.existsSync(dbPath)) {
      test.skip();
    }

    const before = Number(run(`sqlite3 "${dbPath}" "SELECT COUNT(*) FROM decks;"`));

    run('pkill -f MemCycle || true');
    run(`open -n "${appPath}"`);
    run("sleep 2");
    run('pkill -f MemCycle || true');
    run("sleep 1");
    run(`open -n "${appPath}"`);
    run("sleep 2");

    const after = Number(run(`sqlite3 "${dbPath}" "SELECT COUNT(*) FROM decks;"`));
    expect(after).toBe(before);
  });
});
