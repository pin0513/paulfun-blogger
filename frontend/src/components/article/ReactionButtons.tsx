"use client";

import { useState, useEffect } from "react";
import { getArticleReactions, toggleReaction } from "@/lib/api/comments";
import { useAuth } from "@/lib/hooks/useAuth";
import type { ReactionCount } from "@/types";

interface ReactionButtonsProps {
  articleId: number;
}

export function ReactionButtons({ articleId }: ReactionButtonsProps) {
  const { isAuthenticated } = useAuth();
  const [reactions, setReactions] = useState<ReactionCount>({
    likes: 0,
    dislikes: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchReactions() {
      try {
        const res = await getArticleReactions(articleId);
        if (res.success && res.data) {
          setReactions(res.data);
        }
      } catch {
        // silent fail
      }
    }
    fetchReactions();
  }, [articleId]);

  const handleReaction = async (type: "like" | "dislike") => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await toggleReaction(articleId, type);
      if (res.success && res.data) {
        setReactions(res.data);
      }
    } catch {
      // silent fail
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={() => handleReaction("like")}
        disabled={isSubmitting}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
          reactions.userReaction === "like"
            ? "border-primary bg-primary/10 text-primary shadow-glow"
            : "border-border text-text-muted hover:border-primary hover:text-primary"
        }`}
        title={isAuthenticated ? "讚" : "請先登入"}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"
          />
        </svg>
        <span className="text-sm font-mono">{reactions.likes}</span>
      </button>

      <button
        onClick={() => handleReaction("dislike")}
        disabled={isSubmitting}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
          reactions.userReaction === "dislike"
            ? "border-accent bg-accent/10 text-accent shadow-glow-pink"
            : "border-border text-text-muted hover:border-accent hover:text-accent"
        }`}
        title={isAuthenticated ? "踩" : "請先登入"}
      >
        <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"
          />
        </svg>
        <span className="text-sm font-mono">{reactions.dislikes}</span>
      </button>
    </div>
  );
}
