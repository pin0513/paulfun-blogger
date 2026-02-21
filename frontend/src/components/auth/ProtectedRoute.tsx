"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAtomValue } from "jotai";
import {
  isAuthenticatedAtom,
  authLoadingAtom,
  canWriteAtom,
} from "@/lib/store/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireWriter?: boolean;
}

export function ProtectedRoute({
  children,
  requireWriter = false,
}: ProtectedRouteProps) {
  const router = useRouter();
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const isLoading = useAtomValue(authLoadingAtom);
  const canWrite = useAtomValue(canWriteAtom);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/login");
      } else if (requireWriter && !canWrite) {
        router.push("/");
      }
    }
  }, [isAuthenticated, isLoading, canWrite, requireWriter, router]);

  // 僅在「尚未認證」時顯示 spinner；已認證後即使 isLoading 重置也不 unmount children，
  // 避免 AuthProvider 重新驗證時造成表單元素瞬間 detach。
  if (isLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-text-muted">載入中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || (requireWriter && !canWrite)) {
    return null;
  }

  return <>{children}</>;
}
