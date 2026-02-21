"use client";

// TODO: comments API 尚未實作（後端待補 /api/articles/:id/comments）
// 暫時隱藏，避免 404 console error

interface CommentListProps {
  articleId: number;
}

export function CommentList({ articleId: _ }: CommentListProps) {
  return null;
}
