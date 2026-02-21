/**
 * E2E Story：訪客使用旅程
 *
 * 涵蓋場景：
 *   - 訪客打開首頁，看到部落格文章列表
 *   - 訪客點擊文章標題，進入文章詳情頁閱讀
 *   - 訪客透過導覽列瀏覽分類
 *   - 訪客透過導覽列瀏覽標籤
 *   - 訪客嘗試進入後台，被導向登入頁
 *
 * 前置條件：
 *   - Go API server 運行於 localhost:5266（或 NEXT_PUBLIC_API_URL）
 *   - Next.js frontend 運行於 localhost:3000（或 FRONTEND_URL）
 *   - 資料庫已有 seed 文章「Hello, Blog」
 */

import { test, expect } from "@playwright/test";

test.describe("Story：訪客瀏覽部落格", () => {
  test("S1-01 訪客打開首頁，看到文章列表", async ({ page }) => {
    await page.goto("/");

    // 頁面標題或 header 存在
    await expect(page).toHaveTitle(/PaulFun|Blog/i);

    // 文章列表至少有一筆（seed 資料：Hello, Blog）
    const articleLinks = page.locator("a").filter({ hasText: /Hello, Blog/i });
    await expect(articleLinks.first()).toBeVisible();
  });

  test("S1-02 訪客點擊文章標題，進入詳情頁閱讀完整內容", async ({ page }) => {
    await page.goto("/");

    // 點擊第一篇文章
    const firstArticle = page.locator("a").filter({ hasText: /Hello, Blog/i }).first();
    await firstArticle.click();

    // URL 應轉跳到 /articles/<slug>
    await expect(page).toHaveURL(/\/articles\//);

    // 頁面應包含文章標題
    await expect(page.locator("h1")).toContainText(/Hello, Blog/i);

    // 頁面應包含文章內文關鍵字（seed 內容）
    await expect(page.getByText(/PaulFun Blogger/i)).toBeVisible();
  });

  test("S1-03 訪客瀏覽分類頁，看到分類清單", async ({ page }) => {
    await page.goto("/categories");

    // 應顯示至少一個分類（seed：技術、生活、旅遊、閱讀）
    await expect(page.getByText(/技術|Tech/i)).toBeVisible();
  });

  test("S1-04 訪客瀏覽標籤頁，看到標籤清單", async ({ page }) => {
    await page.goto("/tags");

    // 應顯示至少一個標籤（seed：.NET、Next.js 等）
    await expect(page.getByText(/\.NET|Next\.js|React/i)).toBeVisible();
  });

  test("S1-05 訪客直接前往後台，被重導至登入頁", async ({ page }) => {
    await page.goto("/admin");

    // 應被導向登入頁或顯示登入表單
    await expect(page).toHaveURL(/\/login/);
  });
});
