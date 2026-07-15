"use client";

import { useEffect, useState } from "react";
import { likeArticle, unlikeArticle } from "@/lib/api/articles";

interface ReactionButtonsProps {
  articleId: number;
  initialLikeCount?: number;
}

const likedKey = (id: number) => `pf_liked_${id}`;

export function ReactionButtons({
  articleId,
  initialLikeCount = 0,
}: ReactionButtonsProps) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(initialLikeCount);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLiked(localStorage.getItem(likedKey(articleId)) === "1");
  }, [articleId]);

  const toggleLike = async () => {
    if (busy) return;
    setBusy(true);
    // 樂觀更新，失敗再還原
    const next = !liked;
    setLiked(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    try {
      const resp = next
        ? await likeArticle(articleId)
        : await unlikeArticle(articleId);
      if (resp.success && resp.data) {
        setCount(resp.data.likeCount);
      }
      if (next) {
        localStorage.setItem(likedKey(articleId), "1");
      } else {
        localStorage.removeItem(likedKey(articleId));
      }
    } catch {
      // 還原樂觀更新
      setLiked(!next);
      setCount((c) => Math.max(0, c + (next ? -1 : 1)));
    } finally {
      setBusy(false);
    }
  };

  const pageUrl = () =>
    typeof window !== "undefined" ? window.location.href : "";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(pageUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard 不可用時靜默 */
    }
  };

  const shareFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl())}`,
      "_blank",
      "noopener,width=600,height=500"
    );
  };

  const shareLine = () => {
    window.open(
      `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(pageUrl())}`,
      "_blank",
      "noopener,width=600,height=500"
    );
  };

  const btnStyle = (active: boolean): React.CSSProperties => ({
    color: active ? "var(--color-primary)" : "var(--color-text-muted)",
    border: `1px solid ${active ? "var(--color-primary)" : "var(--color-border)"}`,
    background: "transparent",
  });

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* 👍 有幫助 */}
      <button
        onClick={toggleLike}
        disabled={busy}
        aria-pressed={liked}
        className="flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all hover:scale-105"
        style={btnStyle(liked)}
      >
        <span>{liked ? "👍" : "👍🏻"}</span>
        <span>有幫助</span>
        {count > 0 && <span className="font-mono">{count}</span>}
      </button>

      <span
        className="h-5 w-px"
        style={{ background: "var(--color-border)" }}
      />

      {/* 分享 */}
      <button
        onClick={copyLink}
        className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm transition-all hover:scale-105"
        style={btnStyle(copied)}
        title="複製連結"
      >
        {copied ? "✓ 已複製" : "🔗 複製連結"}
      </button>
      <button
        onClick={shareFacebook}
        className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm transition-all hover:scale-105"
        style={btnStyle(false)}
        title="分享到 Facebook"
      >
        分享 FB
      </button>
      <button
        onClick={shareLine}
        className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm transition-all hover:scale-105"
        style={btnStyle(false)}
        title="分享到 LINE"
      >
        分享 LINE
      </button>
    </div>
  );
}
