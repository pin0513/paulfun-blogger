"use client";

import { useCallback } from "react";
import { useAtom, useSetAtom, useAtomValue } from "jotai";
import { useRouter } from "next/navigation";
import {
  accessTokenAtom,
  refreshTokenAtom,
  userAtom,
  isAuthenticatedAtom,
  isAdminAtom,
  canWriteAtom,
  authLoadingAtom,
} from "@/lib/store/auth";
import { login as loginApi, register as registerApi } from "@/lib/api/auth";
import apiClient from "@/lib/api/client";
import type { LoginRequest, RegisterRequest } from "@/types";

export function useAuth() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useAtom(accessTokenAtom);
  const setRefreshToken = useSetAtom(refreshTokenAtom);
  const [user, setUser] = useAtom(userAtom);
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const isAdmin = useAtomValue(isAdminAtom);
  const canWrite = useAtomValue(canWriteAtom);
  const isLoading = useAtomValue(authLoadingAtom);

  const login = useCallback(
    async (data: LoginRequest) => {
      const response = await loginApi(data);

      if (response.success && response.data) {
        const { token, refreshToken, user } = response.data;
        setAccessToken(token);
        setRefreshToken(refreshToken);
        setUser(user);
        apiClient.setToken(token);
        return { success: true };
      }

      return { success: false, message: response.message };
    },
    [setAccessToken, setRefreshToken, setUser]
  );

  const register = useCallback(
    async (data: RegisterRequest) => {
      const response = await registerApi(data);

      if (response.success && response.data) {
        const { token, refreshToken, user } = response.data;
        setAccessToken(token);
        setRefreshToken(refreshToken);
        setUser(user);
        apiClient.setToken(token);
        return { success: true };
      }

      return { success: false, message: response.message };
    },
    [setAccessToken, setRefreshToken, setUser]
  );

  const logout = useCallback(() => {
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
    apiClient.clearToken();
    router.push("/");
  }, [setAccessToken, setRefreshToken, setUser, router]);

  return {
    user,
    accessToken,
    isAuthenticated,
    isAdmin,
    canWrite,
    isLoading,
    login,
    register,
    logout,
  };
}
