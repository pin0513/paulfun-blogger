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
    async function initAuth() {
      if (accessToken) {
        apiClient.setToken(accessToken);
        try {
          const response = await getCurrentUser();
          if (response.success && response.data) {
            setUser(response.data);
          } else {
            // Token invalid, clear it
            apiClient.clearToken();
            setUser(null);
          }
        } catch {
          apiClient.clearToken();
          setUser(null);
        }
      }
      setLoading(false);
    }

    initAuth();
  }, [accessToken, setUser, setLoading]);

  return <>{children}</>;
}
