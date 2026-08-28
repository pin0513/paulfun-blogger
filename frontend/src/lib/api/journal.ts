import apiClient from "./client";
import type { ApiResponse, JournalEntry, JournalDay, JournalStats } from "@/types";

export type UpsertJournalRequest = Omit<
  JournalEntry,
  "entryDate" | "createdAt" | "updatedAt"
>;

export async function getJournalRange(
  from?: string,
  to?: string
): Promise<ApiResponse<JournalDay[]>> {
  return apiClient.get<ApiResponse<JournalDay[]>>("/api/admin/journal", {
    from,
    to,
  } as Record<string, unknown>);
}

export async function getJournalDay(
  date: string
): Promise<ApiResponse<JournalEntry>> {
  return apiClient.get<ApiResponse<JournalEntry>>(`/api/admin/journal/${date}`);
}

export async function upsertJournalDay(
  date: string,
  data: UpsertJournalRequest
): Promise<ApiResponse<JournalEntry>> {
  return apiClient.put<ApiResponse<JournalEntry>>(
    `/api/admin/journal/${date}`,
    data
  );
}

export async function deleteJournalDay(
  date: string
): Promise<ApiResponse<boolean>> {
  return apiClient.delete<ApiResponse<boolean>>(`/api/admin/journal/${date}`);
}

export async function getJournalStats(): Promise<ApiResponse<JournalStats>> {
  return apiClient.get<ApiResponse<JournalStats>>("/api/admin/journal/stats");
}

export async function getJournalFavorites(): Promise<
  ApiResponse<Record<string, string[]>>
> {
  return apiClient.get<ApiResponse<Record<string, string[]>>>(
    "/api/admin/journal/favorites"
  );
}
