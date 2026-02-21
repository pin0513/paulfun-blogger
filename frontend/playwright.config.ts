import { defineConfig, devices } from "@playwright/test";
import * as dotenv from "dotenv";
import * as path from "path";

// 讀取 frontend .env.local，讓 E2E 使用相同設定
dotenv.config({ path: path.resolve(__dirname, ".env.local") });

const FRONTEND_PORT = process.env.E2E_PORT || "3002";
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`;
// NEXT_PUBLIC_API_URL 從 .env.local 載入，若沒有則 fallback
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5266";

/**
 * Playwright E2E 設定
 *
 * - 自動讀取 frontend/.env.local（含 NEXT_PUBLIC_API_URL）
 * - webServer 在測試前自動啟動 Next.js（reuseExistingServer=true 避免衝突）
 * - E2E_PORT 環境變數可覆寫 frontend port（預設 3002）
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],

  use: {
    baseURL: FRONTEND_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  // 自動啟動 Next.js dev server，若已在執行中則直接重用
  webServer: {
    command: `npm run dev -- --port ${FRONTEND_PORT}`,
    url: FRONTEND_URL,
    reuseExistingServer: true,
    timeout: 60_000,
    env: {
      NEXT_PUBLIC_API_URL: API_URL,
    },
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

// 提供給測試 fixtures 使用
export { API_URL, FRONTEND_URL };
