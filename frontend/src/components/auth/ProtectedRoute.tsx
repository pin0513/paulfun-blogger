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

  if (isLoading) {
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
