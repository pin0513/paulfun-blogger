import apiClient from "./client";
import type {
  ApiResponse,
  PagedResponse,
  JournalEntry,
  JournalEntryListItem,
  JournalStats,
} from "@/types";

export interface JournalQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  coping?: string;
  dateFrom?: string;
  dateTo?: string;
}

export type UpsertJournalRequest = Omit<
  JournalEntry,
  "id" | "createdAt" | "updatedAt"
> & { occurredAt?: string };

export async function getJournalEntries(
  params?: JournalQueryParams
): Promise<ApiResponse<PagedResponse<JournalEntryListItem>>> {
  return apiClient.get<ApiResponse<PagedResponse<JournalEntryListItem>>>(
    "/api/admin/journal",
    params as Record<string, unknown>
  );
}

export async function getJournalStats(): Promise<ApiResponse<JournalStats>> {
  return apiClient.get<ApiResponse<JournalStats>>("/api/admin/journal/stats");
}

export async function getJournalEntry(
  id: number | string
): Promise<ApiResponse<JournalEntry>> {
  return apiClient.get<ApiResponse<JournalEntry>>(`/api/admin/journal/${id}`);
}

export async function createJournalEntry(
  data: UpsertJournalRequest
): Promise<ApiResponse<JournalEntry>> {
  return apiClient.post<ApiResponse<JournalEntry>>("/api/admin/journal", data);
}

export async function updateJournalEntry(
  id: number,
  data: UpsertJournalRequest
): Promise<ApiResponse<JournalEntry>> {
  return apiClient.put<ApiResponse<JournalEntry>>(
    `/api/admin/journal/${id}`,
    data
  );
}

export async function deleteJournalEntry(
  id: number
): Promise<ApiResponse<boolean>> {
  return apiClient.delete<ApiResponse<boolean>>(`/api/admin/journal/${id}`);
}
