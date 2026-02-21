/**
 * E2E Story：管理員後台操作旅程
 *
 * 涵蓋場景：
 *   - 管理員以正確帳密登入，成功進入後台
 *   - 管理員以錯誤密碼登入，看到錯誤提示
 *   - 管理員新增文章（草稿）並儲存
 *   - 管理員發佈文章，前台可見
 *   - 管理員上傳圖片（媒體管理）
 *   - 管理員登出，回到首頁
 *
 * 前置條件：
 *   - Go API server 運行於 localhost:5266（或 NEXT_PUBLIC_API_URL）
 *   - Next.js frontend 運行於 localhost:3000（或 FRONTEND_URL）
 *   - 預設管理員帳號：pin0513@gmail.com / Test1234
 */

import { test, expect, Page } from "@playwright/test";
import { ADMIN_CREDENTIALS, loginAsAdmin } from "../fixtures/auth";

// ─── 輔助：UI 登入流程 ───────────────────────────────────────────────────────

async function uiLogin(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(ADMIN_CREDENTIALS.email);
  await page.getByLabel(/密碼|password/i).fill(ADMIN_CREDENTIALS.password);
  await page.getByRole("button", { name: /登入|login/i }).click();
  // 登入後應跳轉到後台
  await expect(page).toHaveURL(/\/admin/);
}

// ─── Story 2：管理員登入 ──────────────────────────────────────────────────────

test.describe("Story：管理員登入", () => {
  test("S2-01 管理員輸入正確帳密，成功登入並進入後台", async ({ page }) => {
    await uiLogin(page);

    // 後台頁面應有歡迎文字或儀表板元素
    await expect(page.locator("body")).toContainText(/管理|Dashboard|後台/i);
  });

  test("S2-02 管理員輸入錯誤密碼，看到錯誤提示訊息", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(ADMIN_CREDENTIALS.email);
    await page.getByLabel(/密碼|password/i).fill("WrongPassword999");
    await page.getByRole("button", { name: /登入|login/i }).click();

    // 應顯示錯誤訊息（不跳轉）
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator("body")).toContainText(/錯誤|失敗|incorrect|invalid/i);
  });
});

// ─── Story 3：管理員建立並發佈文章 ────────────────────────────────────────────

test.describe("Story：管理員建立並發佈文章", () => {
  const TEST_TITLE = `E2E 測試文章 ${Date.now()}`;
  const TEST_SUMMARY = "這是 Playwright E2E 自動建立的測試文章";

  test.beforeEach(async ({ page }) => {
    // 使用 API 登入（比 UI 快）
    await loginAsAdmin(page);
    await page.goto("/admin");
  });

  test("S3-01 管理員點擊新增文章，填寫標題與摘要後儲存為草稿", async ({ page }) => {
    // 找「新增文章」按鈕
    await page.getByRole("link", { name: /新增文章|new article/i }).click();
    await expect(page).toHaveURL(/\/admin\/articles\/new/);

    // 填寫標題
    await page.getByLabel(/標題|title/i).fill(TEST_TITLE);

    // 填寫摘要（若有獨立摘要欄位）
    const summaryField = page.getByLabel(/摘要|summary/i);
    if (await summaryField.isVisible()) {
      await summaryField.fill(TEST_SUMMARY);
    }

    // 填寫內文（Tiptap editor，用 contenteditable 定位）
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    await editor.fill("這是測試文章的內文，由 Playwright 自動輸入。");

    // 儲存草稿
    await page.getByRole("button", { name: /儲存草稿|save draft/i }).click();

    // 應成功（顯示成功訊息或跳轉到文章列表）
    await expect(page.locator("body")).toContainText(/成功|saved|draft/i);
  });

  test("S3-02 管理員在文章列表找到草稿，點擊發佈後前台可見", async ({ page }) => {
    await page.goto("/admin/articles");

    // 找到含 TEST_TITLE 的文章列（草稿狀態）
    const articleRow = page.locator("tr, [data-testid='article-item']").filter({
      hasText: TEST_TITLE,
    });

    // 若前一個測試沒有建立，略過
    if (!(await articleRow.isVisible())) {
      test.skip();
      return;
    }

    // 點擊「發佈」或「...」選單中的發佈
    const publishBtn = articleRow.getByRole("button", { name: /發佈|publish/i });
    await publishBtn.click();

    // 確認發佈成功
    await expect(page.locator("body")).toContainText(/發佈成功|published/i);

    // 前台應可見此文章
    await page.goto("/");
    await expect(page.getByText(TEST_TITLE)).toBeVisible();
  });
});

// ─── Story 4：管理員上傳圖片 ─────────────────────────────────────────────────

test.describe("Story：管理員媒體管理", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/media");
  });

  test("S4-01 管理員進入媒體管理，上傳一張圖片，確認出現在媒體庫", async ({ page }) => {
    // 建立一個最小合法 PNG（1x1 pixel）的 Buffer
    const pngBytes = Buffer.from(
      "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489" +
        "0000000a49444154789c6260000000020001e221bc330000000049454e44ae426082",
      "hex"
    );

    // 觸發 file input
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "test-upload.png",
      mimeType: "image/png",
      buffer: pngBytes,
    });

    // 等待上傳完成（可能有進度條或成功訊息）
    await expect(page.locator("body")).toContainText(/上傳成功|uploaded|test-upload/i, {
      timeout: 15_000,
    });

    // 媒體庫中應可見剛上傳的圖片
    await expect(page.getByAltText(/test-upload/i).or(page.getByText(/test-upload/i))).toBeVisible();
  });
});

// ─── Story 5：管理員登出 ──────────────────────────────────────────────────────

test.describe("Story：管理員登出", () => {
  test("S5-01 管理員在後台點擊登出，返回首頁並清除 token", async ({ page }) => {
    await uiLogin(page);

    // 確認在後台
    await expect(page).toHaveURL(/\/admin/);

    // 點擊登出按鈕（可能在 header 或 sidebar）
    await page.getByRole("button", { name: /登出|logout/i }).click();

    // 應跳轉回首頁或登入頁
    await expect(page).toHaveURL(/\/$|\/login/);

    // localStorage token 應被清除
    const token = await page.evaluate(() => localStorage.getItem("accessToken"));
    expect(token).toBeNull();

    // 再次嘗試進入後台，應被導向登入頁
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });
});
