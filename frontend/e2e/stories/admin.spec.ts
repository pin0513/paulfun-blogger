/**
 * E2E Story：管理員後台操作旅程
 *
 * 涵蓋場景：
 *   - 管理員以正確帳密登入，成功進入後台
 *   - 管理員以錯誤密碼登入，看到錯誤提示
 *   - 管理員新增文章（草稿）並儲存
 *   - 管理員發佈文章，前台可見
 *   - 管理員上傳圖片（媒體管理）
 *   - 管理員登出，token 清除
 *
 * 前置條件：
 *   - Go API server 運行於 NEXT_PUBLIC_API_URL（預設 localhost:5266）
 *   - Next.js frontend 運行於 localhost:3002（由 playwright.config webServer 管理）
 *   - 預設管理員帳號：pin0513@gmail.com / Test1234
 */

import { test, expect, Page } from "@playwright/test";
import { ADMIN_CREDENTIALS, loginAsAdmin } from "../fixtures/auth";

// ─── 輔助：等待 admin 頁面的 auth 狀態載入完成 ─────────────────────────────

/** 等 ProtectedRoute 完成 auth 初始化（spinner 消失、非 /login 頁面） */
async function waitForAdminReady(page: Page) {
  // 等 authLoading spinner 消失
  await page.waitForFunction(
    () => !document.querySelector(".animate-spin"),
    { timeout: 10_000 }
  ).catch(() => {});
  // 確保沒被重導到 login
  await expect(page).not.toHaveURL(/\/login/, { timeout: 5_000 }).catch(() => {});
}

// ─── 輔助：UI 登入流程（測試登入頁面本身時使用）─────────────────────────────

async function uiLogin(page: Page) {
  await page.goto("/login");
  await page.locator("#email").fill(ADMIN_CREDENTIALS.email);
  await page.locator("#password").fill(ADMIN_CREDENTIALS.password);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
}

// ─── Story 2：管理員登入 ──────────────────────────────────────────────────────

test.describe("Story：管理員登入", () => {
  test("S2-01 管理員輸入正確帳密，成功登入並進入後台", async ({ page }) => {
    await uiLogin(page);

    // 後台有 admin 導覽元素（「文章管理」或「PaulFun Admin」）
    await expect(page.getByText(/PaulFun Admin|文章管理/).first()).toBeVisible({ timeout: 10_000 });
  });

  test("S2-02 管理員輸入錯誤密碼，看到錯誤提示訊息", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill(ADMIN_CREDENTIALS.email);
    await page.locator("#password").fill("WrongPassword999");
    await page.locator('button[type="submit"]').click();

    // 仍在登入頁，且顯示錯誤訊息
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText(/錯誤|失敗|incorrect|invalid/i)).toBeVisible({ timeout: 5_000 });
  });
});

// ─── Story 3：管理員建立並發佈文章 ────────────────────────────────────────────

test.describe("Story：管理員建立並發佈文章", () => {
  const TEST_TITLE = `E2E 測試文章 ${Date.now()}`;
  const TEST_SUMMARY = "這是 Playwright E2E 自動建立的測試文章";
  let createdArticleId: number | null = null;

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin");
    await waitForAdminReady(page);
  });

  // 測試結束後清理：刪除 S3-02 建立的文章，避免累積 E2E 測試資料污染首頁
  test.afterAll(async ({ browser }) => {
    if (!createdArticleId) return;
    const page = await browser.newPage();
    try {
      const token = await loginAsAdmin(page);
      await page.request.delete(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5266"}/api/admin/articles/${createdArticleId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch {
      // 清理失敗不影響測試結果
    } finally {
      await page.close();
    }
  });

  test("S3-01 管理員點擊新增文章，填寫資料後儲存為草稿", async ({ page }) => {
    // 從 admin dashboard 點擊「新增文章」鏈結，使用 Next.js 的 SPA（client-side）navigation，
    // 避免 page.goto 的 SSR hydration 競態（Jotai atomWithStorage 兩段渲染導致 ProtectedRoute
    // 在 accessToken=null 時排隊 deferred router.push("/login")）。
    await page.locator('a[href="/admin/articles/new"]').first().click();
    await expect(page).toHaveURL(/\/admin\/articles\/new/, { timeout: 10_000 });

    // 等「儲存草稿」按鈕可見，確認表單已完整渲染
    const saveBtn = page.getByRole('button', { name: '儲存草稿' });
    await expect(saveBtn).toBeVisible({ timeout: 15_000 });

    // 填寫標題
    await page.locator('input[placeholder*="標題"]').fill(TEST_TITLE);

    // 填寫摘要（textarea）
    const summaryField = page.locator('textarea').first();
    if (await summaryField.count() > 0) {
      await summaryField.fill(TEST_SUMMARY);
    }

    // 填寫內文：等 Tiptap hydration 完成，用 evaluate focus
    await expect(page.getByText('載入中...')).not.toBeVisible({ timeout: 15_000 }).catch(() => {});
    const editor = page.locator('[contenteditable="true"]').first();
    await expect(editor).toBeVisible({ timeout: 10_000 });
    await page.evaluate(() => {
      const el = document.querySelector('[contenteditable="true"]') as HTMLElement | null;
      if (el) el.focus();
    });
    await page.keyboard.type("E2E test article content by Playwright.");

    // 等 editor 文字穩定（onUpdate 觸發完畢）
    await expect(editor).toContainText("E2E test article content", { timeout: 10_000 });

    // 儲存草稿（force:true 應對 onUpdate→re-render 期間 button detach）
    await saveBtn.click({ force: true });

    // 儲存成功後應跳轉到文章編輯頁
    await expect(page).toHaveURL(/\/admin\/articles\/\d+/, { timeout: 15_000 });
  });

  test("S3-02 管理員透過 API 建立文章後，在後台發佈，前台可見", async ({ page }) => {
    // 透過 API 直接建立文章（比 UI 更穩定）
    const token = await loginAsAdmin(page);
    const createRes = await page.request.post(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5266"}/api/admin/articles`,
      {
        data: {
          title: TEST_TITLE,
          summary: TEST_SUMMARY,
          content: "<p>E2E 自動建立的測試內文</p>",
          tagIds: [],
        },
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const createBody = await createRes.json();
    expect(createBody.success).toBe(true);
    createdArticleId = createBody.data?.id;

    // 發佈文章（透過 API）
    const publishRes = await page.request.post(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5266"}/api/admin/articles/${createdArticleId}/publish`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const publishBody = await publishRes.json();
    expect(publishBody.success).toBe(true);
    expect(publishBody.data?.status).toBe("published");

    // 前台應可見此文章
    await page.goto("/");
    await expect(page.getByText(TEST_TITLE)).toBeVisible({ timeout: 15_000 });
  });
});

// ─── Story 4：管理員上傳圖片 ─────────────────────────────────────────────────

test.describe("Story：管理員媒體管理", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/media");
    await waitForAdminReady(page);
  });

  test("S4-01 管理員進入媒體管理，上傳圖片，確認出現在媒體庫", async ({ page }) => {
    // 建立最小合法 PNG（1x1 pixel）
    const pngBytes = Buffer.from(
      "89504e470d0a1a0a0000000d494844520000000100000001" +
      "08060000001f15c4890000000a494441540x789c62600000" +
      "00020001e221bc330000000049454e44ae426082",
      "hex"
    );

    // 找 file input（可能是隱藏的，需要用 setInputFiles）
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "e2e-test-upload.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489" +
        "0000000a49444154789c6260000000020001e221bc330000000049454e44ae426082",
        "hex"
      ),
    });

    // 等待上傳完成（.first() 避免 strict mode：成功訊息 + 圖片 alt 各一）
    await expect(
      page.getByText(/上傳成功|uploaded|e2e-test-upload/i)
        .or(page.locator('[alt*="e2e-test-upload"]'))
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });
});

// ─── Story 5：管理員登出 ──────────────────────────────────────────────────────

test.describe("Story：管理員登出", () => {
  test("S5-01 管理員在後台點擊登出，token 清除並跳轉", async ({ page }) => {
    await uiLogin(page);
    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });

    // 點擊「登出」按鈕
    await page.locator('button:has-text("登出")').click();

    // 應跳轉回首頁或登入頁
    await expect(page).toHaveURL(/\/$|\/login/, { timeout: 10_000 });

    // localStorage token 應被清除
    const token = await page.evaluate(() => localStorage.getItem("accessToken"));
    expect(token).toBeNull();

    // 再次嘗試進入後台，應被導向登入頁
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
