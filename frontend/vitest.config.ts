import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    // 只跑單元測試。E2E 在 e2e/ 目錄由 Playwright 負責，
    // 兩者共存於同一個 repo，不要讓 vitest 去撿 Playwright 的檔案。
    include: ["src/**/*.test.{ts,tsx}"],
  },
  // Next.js 的 tsconfig 是 jsx: "preserve"（由 Next 自己轉），
  // vitest 走 esbuild 不吃那個設定，要明講用 automatic runtime，
  // 否則測試裡的 JSX 會編成 React.createElement 而報 "React is not defined"。
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
