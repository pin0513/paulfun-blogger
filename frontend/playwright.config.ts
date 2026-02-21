import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E 測試設定
 *
 * 執行前需確保：
 *   - Go API server 已啟動（port 8080 / 5266）
 *   - Next.js frontend 已啟動（port 3000）
 *   - PostgreSQL 已啟動且已 seed 預設資料
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],

  use: {
    baseURL: process.env.FRONTEND_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
