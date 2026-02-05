"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("密碼不一致");
      return;
    }

    if (password.length < 6) {
      setError("密碼至少需要 6 個字元");
      return;
    }

    setIsLoading(true);

    try {
      const result = await register({ email, password, displayName });
      if (result.success) {
        router.push("/admin");
      } else {
        setError(result.message || "註冊失敗");
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
              註冊
            </h1>
            <p className="text-text-muted mt-2">建立你的帳號</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-md text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="displayName"
                className="block text-sm font-medium text-text mb-1"
              >
                顯示名稱
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input"
                placeholder="你的名字"
                required
                disabled={isLoading}
              />
            </div>

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
                placeholder="至少 6 個字元"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-text mb-1"
              >
                確認密碼
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                placeholder="再次輸入密碼"
                required
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={isLoading}
            >
              {isLoading ? "註冊中..." : "註冊"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-text-muted">
            已有帳號？{" "}
            <Link href="/login" className="text-primary hover:underline">
              登入
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
