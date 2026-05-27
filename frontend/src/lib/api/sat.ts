import apiClient from "./client";
import type { ApiResponse } from "@/types";

// ── DTO 型別（對齊 backend-go/internal/dto/sat_dto.go） ────────────

export interface SAT {
  id: number;
  userId: number;
  name: string;
  tokenPrefix: string; // "sat_" + 8 chars
  isActive: boolean;
  expiresAt: string | null; // ISO string；null = 永不過期
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface SATCreateRequest {
  name: string;
  userId: number;
  expiresAt: string | null; // ISO string；null = 永不過期
}

export interface SATUpdateRequest {
  name?: string;
  expiresAt?: string | null;
  isActive?: boolean;
}

/**
 * 建立 SAT 的 response — 包含明文 token，只有此次顯示。
 * 之後永遠看不到。
 */
export interface SATCreateResponse extends SAT {
  token: string;
}

// ── API client ────────────────────────────────────────────────────

const BASE = "/api/admin/service-account-tokens";

export async function listSATs(): Promise<ApiResponse<SAT[]>> {
  return apiClient.get<ApiResponse<SAT[]>>(BASE);
}

export async function createSAT(
  req: SATCreateRequest,
): Promise<ApiResponse<SATCreateResponse>> {
  return apiClient.post<ApiResponse<SATCreateResponse>>(BASE, req);
}

export async function updateSAT(
  id: number,
  req: SATUpdateRequest,
): Promise<ApiResponse<SAT>> {
  return apiClient.patch<ApiResponse<SAT>>(`${BASE}/${id}`, req);
}

export async function deleteSAT(id: number): Promise<ApiResponse<null>> {
  return apiClient.delete<ApiResponse<null>>(`${BASE}/${id}`);
}
