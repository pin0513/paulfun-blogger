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

// Public APIs
export async function getArticles(
  params?: ArticleQueryParams
): Promise<ApiResponse<PagedResponse<ArticleListItem>>> {
  return apiClient.get<ApiResponse<PagedResponse<ArticleListItem>>>(
    "/api/articles",
    params as Record<string, unknown>
  );
}

export async function getArticleByID(
  id: number
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
