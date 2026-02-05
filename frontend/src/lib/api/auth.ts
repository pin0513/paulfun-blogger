import apiClient from "./client";
import type {
  ApiResponse,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
} from "@/types";

export async function login(
  data: LoginRequest
): Promise<ApiResponse<AuthResponse>> {
  return apiClient.post<ApiResponse<AuthResponse>>("/api/auth/login", data);
}

export async function register(
  data: RegisterRequest
): Promise<ApiResponse<AuthResponse>> {
  return apiClient.post<ApiResponse<AuthResponse>>("/api/auth/register", data);
}

export async function getCurrentUser(): Promise<ApiResponse<User>> {
  return apiClient.get<ApiResponse<User>>("/api/auth/me");
}

export async function refreshToken(
  token: string
): Promise<ApiResponse<AuthResponse>> {
  return apiClient.post<ApiResponse<AuthResponse>>("/api/auth/refresh", {
    refreshToken: token,
  });
}
