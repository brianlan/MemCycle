import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e-native",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "html",
  timeout: 120000,
});
