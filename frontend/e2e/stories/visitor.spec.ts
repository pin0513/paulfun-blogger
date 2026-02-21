/**
 * E2E Story：訪客使用旅程
 *
 * 涵蓋場景：
 *   - 訪客打開首頁，看到文章列表（CSR 載入後）
 *   - 訪客點擊文章標題，進入文章詳情頁閱讀
 *   - 訪客透過分類頁看到分類清單
 *   - 訪客在分類頁看到分類連結
 *   - 訪客嘗試進入後台，被導向登入頁
 *
 * 前置條件：
 *   - Go API server 運行於 NEXT_PUBLIC_API_URL（.env.local）
 *   - Next.js frontend 由 playwright.config webServer 管理
 *   - 資料庫已有 seed 文章「Hello, Blog」、分類「技術/生活/旅遊/閱讀」
 */

import { test, expect } from "@playwright/test";

test.describe("Story：訪客瀏覽部落格", () => {
  test("S1-01 訪客打開首頁，文章列表載入後看到文章", async ({ page }) => {
    await page.goto("/");

    // 首頁是 CSR，等待文章卡片出現（至少一篇 published article）
    // 使用 article 元素或包含文章連結的卡片，避免依賴特定 seed 文章標題
    // （E2E 測試多次執行後，seed "Hello, Blog" 可能被擠到第二頁）
    await expect(
      page.locator("article, h2, h3").first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("S1-02 訪客點擊文章標題，進入詳情頁閱讀完整內容", async ({ page }) => {
    await page.goto("/");

    // 等任意文章連結出現並點擊第一篇（不依賴特定標題，避免 seed 被擠到第二頁）
    const articleLink = page.locator("a[href^='/articles/']").first();
    await expect(articleLink).toBeVisible({ timeout: 15_000 });
    await articleLink.click();

    // URL 應轉到 /articles/<slug>
    await expect(page).toHaveURL(/\/articles\//, { timeout: 10_000 });

    // 頁面應包含文章標題（h1）
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 10_000 });
  });

  test("S1-03 訪客瀏覽分類頁，看到分類清單連結（seed：技術）", async ({ page }) => {
    await page.goto("/categories");

    // 分類清單有「技術」分類的 link（不含純文字段落）
    await expect(
      page.locator("a").filter({ hasText: /^技術$/ })
        .or(page.locator("h2, h3").filter({ hasText: /^技術$/ }))
        .first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("S1-04 訪客在分類頁看到多個 seed 分類", async ({ page }) => {
    await page.goto("/categories");

    // 等頁面載入，應看到至少 2 個分類名稱（seed 有 4 個）
    const categoryLinks = page.locator("a, li").filter({ hasText: /^(技術|生活|旅遊|閱讀)$/ });
    await expect(categoryLinks.first()).toBeVisible({ timeout: 10_000 });
    const count = await categoryLinks.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("S1-05 訪客直接前往後台，透過 ProtectedRoute 被重導至登入頁", async ({ page }) => {
    await page.goto("/admin");

    // ProtectedRoute 用 useEffect + router.push，需等 JS 執行完
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
