"use client";

// TODO: reactions API 尚未實作（後端待補 /api/articles/:id/reactions）
// 暫時隱藏，避免 404 console error

interface ReactionButtonsProps {
  articleId: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ReactionButtons({ articleId }: ReactionButtonsProps) {
  return null;
}
