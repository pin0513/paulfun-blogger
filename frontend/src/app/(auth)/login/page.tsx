"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await login({ email, password });
      if (result.success) {
        router.push("/admin");
      } else {
        setError(result.message || "登入失敗");
      }
    } catch {
      setError("發生錯誤，請稍後再試");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 bg-animated-gradient">
      <div className="w-full max-w-md">
        <div className="card border-gradient">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-heading font-bold text-primary text-neon">
              登入
            </h1>
            <p className="text-text-muted mt-2">歡迎回來</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-md text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-text mb-1"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="your@email.com"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-text mb-1"
              >
                密碼
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={isLoading}
            >
              {isLoading ? "登入中..." : "登入"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-text-muted">
            還沒有帳號？{" "}
            <Link href="/register" className="text-primary hover:underline">
              註冊
            </Link>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Link href="/" className="text-sm text-text-muted hover:text-primary">
            ← 返回首頁
          </Link>
        </div>
      </div>
    </div>
  );
}
