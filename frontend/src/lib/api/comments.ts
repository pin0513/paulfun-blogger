import apiClient from "./client";
import type { ApiResponse, Comment, ReactionCount } from "@/types";

// Comments
export async function getArticleComments(
  articleId: number
): Promise<ApiResponse<Comment[]>> {
  return apiClient.get<ApiResponse<Comment[]>>(
    `/api/articles/${articleId}/comments`
  );
}

export async function createComment(
  articleId: number,
  data: { content: string; parentId?: number }
): Promise<ApiResponse<Comment>> {
  return apiClient.post<ApiResponse<Comment>>(
    `/api/articles/${articleId}/comments`,
    data
  );
}

// Reactions
export async function getArticleReactions(
  articleId: number
): Promise<ApiResponse<ReactionCount>> {
  return apiClient.get<ApiResponse<ReactionCount>>(
    `/api/articles/${articleId}/reactions`
  );
}

export async function toggleReaction(
  articleId: number,
  type: "like" | "dislike"
): Promise<ApiResponse<ReactionCount>> {
  return apiClient.post<ApiResponse<ReactionCount>>(
    `/api/articles/${articleId}/reactions`,
    { type }
  );
}
