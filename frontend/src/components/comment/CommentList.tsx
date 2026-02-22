"use client";

// TODO: comments API 尚未實作（後端待補 /api/articles/:id/comments）
// 暫時隱藏，避免 404 console error

interface CommentListProps {
  articleId: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function CommentList({ articleId }: CommentListProps) {
  return null;
}
