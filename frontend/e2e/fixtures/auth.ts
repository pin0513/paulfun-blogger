import { Page } from "@playwright/test";
import * as dotenv from "dotenv";
import * as path from "path";

// 讀取 frontend/.env.local，取得相同的 API URL 設定
dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

/** 預設管理員帳號（對應 backend-go/internal/db/seed.go） */
export const ADMIN_CREDENTIALS = {
  email: "pin0513@gmail.com",
  password: "Test1234",
};

/** API base URL，與前端使用同一份 .env.local */
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5266";

/**
 * 以 API 方式取得 token，並存入 localStorage。
 * AuthProvider 會自動讀取 localStorage 的 accessToken 並呼叫 /auth/me 補齊 userAtom。
 * 需在 page.goto() 之後呼叫，讓 localStorage 在目標 origin 下設定。
 */
export async function loginAsAdmin(page: Page): Promise<string> {
  // 先到前端首頁，建立 origin context，才能寫入 localStorage
  await page.goto("/");

  // 呼叫 Go API 取得 token
  const res = await page.request.post(`${API_URL}/api/auth/login`, {
    data: {
      email: ADMIN_CREDENTIALS.email,
      password: ADMIN_CREDENTIALS.password,
    },
  });

  const body = await res.json();
  const token: string = body.data?.token;
  if (!token) throw new Error("loginAsAdmin: 無法取得 token，請確認 Go server 已啟動");

  // 將 token 寫入 localStorage（Jotai atomWithStorage 用 JSON.stringify，需包 JSON 字串）
  await page.evaluate((t) => {
    localStorage.setItem("accessToken", JSON.stringify(t));
  }, token);

  return token;
}
