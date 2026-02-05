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

// 取得媒體完整 URL 的輔助函數
// 之後若切換到 Cloud Storage，只需修改此處
export function getMediaUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  if (path.startsWith("http")) {
    return path;
  }
  return `${baseUrl}/${path}`;
}
