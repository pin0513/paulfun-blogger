import apiClient from "./client";
import type { ApiResponse, PagedResponse, Media } from "@/types";

export interface MediaQueryParams {
  page?: number;
  pageSize?: number;
  mimeType?: string;
  search?: string;
}

export interface UploadMediaResponse {
  id: number;
  fileName: string;
  url: string;
  fileSize: number;
  mimeType: string;
}

// 媒體上傳服務 - 設計為可替換的模組
// 之後可能會改為 Cloud Storage 或其他服務
export async function getMedia(
  params?: MediaQueryParams
): Promise<ApiResponse<PagedResponse<Media>>> {
  return apiClient.get<ApiResponse<PagedResponse<Media>>>(
    "/api/admin/media",
    params as Record<string, unknown>
  );
}

export async function uploadMedia(
  file: File
): Promise<ApiResponse<UploadMediaResponse>> {
  return apiClient.upload<ApiResponse<UploadMediaResponse>>(
    "/api/admin/media/upload",
    file
  );
}

export async function deleteMedia(id: number): Promise<ApiResponse<boolean>> {
  return apiClient.delete<ApiResponse<boolean>>(`/api/admin/media/${id}`);
}

// R2 公開 URL prefix（生產環境設定，本地開發為空）
const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_URL || "";

// 取得媒體完整 URL 的輔助函數
// - 已是完整 URL (https://...) → 直接回傳
// - 有設定 R2_PUBLIC_URL → 組合 R2 URL
// - 無 R2 → 使用相對路徑（由 nginx/rewrite 代理）
export function getMediaUrl(path: string): string {
  if (path.startsWith("http")) {
    return path;
  }
  if (R2_PUBLIC_URL) {
    const clean = path.startsWith("/") ? path.slice(1) : path;
    return `${R2_PUBLIC_URL}/${clean}`;
  }
  return path.startsWith("/") ? path : `/${path}`;
}

// 取得站內靜態圖片 URL（avatar, hero bg 等）
// R2 模式: https://img.paulfun.net/static/avatar-paul.jpg
// 本地模式: /images/avatar-paul.jpg
export function getStaticImageUrl(filename: string): string {
  if (R2_PUBLIC_URL) {
    return `${R2_PUBLIC_URL}/static/${filename}`;
  }
  return `/images/${filename}`;
}

// 取得文章封面 URL（無封面時使用預設圖片）
const DEFAULT_COVER = R2_PUBLIC_URL
  ? `${R2_PUBLIC_URL}/static/default-cover.png`
  : "/images/default-cover.png";

export function getCoverUrl(coverImage?: string | null): string {
  return getMediaUrl(coverImage || DEFAULT_COVER);
}
