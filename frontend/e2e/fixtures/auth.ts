import { Page } from "@playwright/test";

/** 預設管理員帳號（對應 backend-go/internal/db/seed.go） */
export const ADMIN_CREDENTIALS = {
  email: "pin0513@gmail.com",
  password: "Test1234",
};

/** API base URL */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5266";

/**
 * 以管理員身分登入，並將 token 存入 localStorage
 * 可在 beforeEach 使用，跳過 UI 登入流程以加快測試速度
 */
export async function loginAsAdmin(page: Page) {
  const res = await page.request.post(`${API_URL}/api/auth/login`, {
    data: {
      email: ADMIN_CREDENTIALS.email,
      password: ADMIN_CREDENTIALS.password,
    },
  });

  const body = await res.json();
  const token: string = body.data?.token;

  await page.goto("/");
  await page.evaluate((t) => localStorage.setItem("accessToken", t), token);
  return token;
}
