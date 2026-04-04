import apiClient from "./client";
import type {
  ApiResponse,
  PagedResponse,
  Article,
  ArticleListItem,
} from "@/types";

export interface ArticleQueryParams {
  page?: number;
  pageSize?: number;
  status?: string;
  categoryId?: number;
  tagId?: number;
  search?: string;
  sortBy?: string;
  descending?: boolean;
}

export interface CreateArticleRequest {
  title: string;
  summary?: string;
  content: string;
  coverImage?: string;
  categoryId?: number;
  tagIds?: number[];
}

export type UpdateArticleRequest = CreateArticleRequest;

export interface PatchArticleRequest {
  title?: string;
  summary?: string | null;
  content?: string | null;
  coverImage?: string | null;
  categoryId?: number | null;
  tagIds?: number[];
}

export interface ArticleArchive {
  id: number;
  articleId: number;
  title: string;
  version: number;
  archivedAt: string;
  archivedBy: number;
}

export interface ArticleArchiveDetail extends ArticleArchive {
  slug: string;
  summary?: string;
  content?: string;
  coverImage?: string;
  categoryId?: number;
  status: string;
  tagIds: string;
}

// Public APIs
export async function getArticles(
  params?: ArticleQueryParams
): Promise<ApiResponse<PagedResponse<ArticleListItem>>> {
  return apiClient.get<ApiResponse<PagedResponse<ArticleListItem>>>(
    "/api/articles",
    params as Record<string, unknown>
  );
}

export async function getArticleById(
  id: number | string
): Promise<ApiResponse<Article>> {
  return apiClient.get<ApiResponse<Article>>(`/api/articles/${id}`);
}

// Admin APIs
export async function getAdminArticles(
  params?: ArticleQueryParams
): Promise<ApiResponse<PagedResponse<ArticleListItem>>> {
  return apiClient.get<ApiResponse<PagedResponse<ArticleListItem>>>(
    "/api/admin/articles",
    params as Record<string, unknown>
  );
}

export async function getAdminArticle(
  id: number
): Promise<ApiResponse<Article>> {
  return apiClient.get<ApiResponse<Article>>(`/api/admin/articles/${id}`);
}

export async function createArticle(
  data: CreateArticleRequest
): Promise<ApiResponse<Article>> {
  return apiClient.post<ApiResponse<Article>>("/api/admin/articles", data);
}

export async function updateArticle(
  id: number,
  data: UpdateArticleRequest
): Promise<ApiResponse<Article>> {
  return apiClient.put<ApiResponse<Article>>(`/api/admin/articles/${id}`, data);
}

export async function patchArticle(
  id: number,
  data: PatchArticleRequest
): Promise<ApiResponse<Article>> {
  return apiClient.patch<ApiResponse<Article>>(`/api/admin/articles/${id}`, data);
}

export async function getArticleArchives(
  id: number
): Promise<ApiResponse<ArticleArchive[]>> {
  return apiClient.get<ApiResponse<ArticleArchive[]>>(
    `/api/admin/articles/${id}/archives`
  );
}

export async function getArticleArchiveDetail(
  articleId: number,
  archiveId: number
): Promise<ApiResponse<ArticleArchiveDetail>> {
  return apiClient.get<ApiResponse<ArticleArchiveDetail>>(
    `/api/admin/articles/${articleId}/archives/${archiveId}`
  );
}

export async function restoreArticle(
  articleId: number,
  archiveId: number
): Promise<ApiResponse<Article>> {
  return apiClient.post<ApiResponse<Article>>(
    `/api/admin/articles/${articleId}/restore/${archiveId}`
  );
}

export async function deleteArticle(id: number): Promise<ApiResponse<boolean>> {
  return apiClient.delete<ApiResponse<boolean>>(`/api/admin/articles/${id}`);
}

export async function publishArticle(
  id: number,
  scheduledAt?: Date
): Promise<ApiResponse<Article>> {
  return apiClient.post<ApiResponse<Article>>(
    `/api/admin/articles/${id}/publish`,
    scheduledAt ? { scheduledAt: scheduledAt.toISOString() } : {}
  );
}

export async function unpublishArticle(
  id: number
): Promise<ApiResponse<Article>> {
  return apiClient.post<ApiResponse<Article>>(
    `/api/admin/articles/${id}/unpublish`
  );
}

// Categories and Tags
export async function getCategories(): Promise<
  ApiResponse<Array<{ id: number; name: string; slug: string }>>
> {
  return apiClient.get<
    ApiResponse<Array<{ id: number; name: string; slug: string }>>
  >("/api/articles/categories");
}

export async function getTags(): Promise<
  ApiResponse<Array<{ id: number; name: string; slug: string }>>
> {
  return apiClient.get<
    ApiResponse<Array<{ id: number; name: string; slug: string }>>
  >("/api/articles/tags");
}
