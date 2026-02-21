"use client";

import { useEffect } from "react";
import { useAtom, useSetAtom } from "jotai";
import {
  accessTokenAtom,
  userAtom,
  authLoadingAtom,
} from "@/lib/store/auth";
import { getCurrentUser } from "@/lib/api/auth";
import apiClient from "@/lib/api/client";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken] = useAtom(accessTokenAtom);
  const setUser = useSetAtom(userAtom);
  const setLoading = useSetAtom(authLoadingAtom);

  useEffect(() => {
    let cancelled = false;
    let nullTokenTimer: ReturnType<typeof setTimeout> | null = null;

    if (accessToken) {
      // 有 token：呼叫 API 驗證，完成後 setLoading(false)
      apiClient.setToken(accessToken);
      getCurrentUser()
        .then((response) => {
          if (cancelled) return;
          if (response.success && response.data) {
            setUser(response.data);
          } else {
            apiClient.clearToken();
            setUser(null);
          }
        })
        .catch(() => {
          if (cancelled) return;
          apiClient.clearToken();
          setUser(null);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    } else {
      // accessToken === null：可能是 Jotai atomWithStorage 尚未從 localStorage 水合。
      // 讓出一個 event-loop tick（60ms），讓 Jotai onMount 有機會讀取 localStorage 並更新 atom。
      // 若 Jotai 水合（accessToken 變為真實值），cleanup 會取消 timer，effect 重新以真實 token 執行。
      // 若使用者真的沒有 token，60ms 後 setLoading(false) → ProtectedRoute 才重導 /login。
      nullTokenTimer = setTimeout(() => {
        if (!cancelled) setLoading(false);
      }, 60);
    }

    return () => {
      cancelled = true;
      if (nullTokenTimer !== null) clearTimeout(nullTokenTimer);
    };
  }, [accessToken, setUser, setLoading]);

  return <>{children}</>;
}
