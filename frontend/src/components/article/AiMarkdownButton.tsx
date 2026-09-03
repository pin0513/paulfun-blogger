"use client";

import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

type State = "idle" | "loading" | "copied" | "error";

/**
 * 把整篇文章的 AI 可讀 Markdown 一鍵放進剪貼簿。
 *
 * 為什麼是「複製全文」而不是「複製網址」：貼一個網址進 ChatGPT／Claude 的
 * 對話框，對方不一定抓得到（有些不會主動連外，有些被站台擋）。直接給全文，
 * 任何模型都讀得到。要給會自己抓網頁的 agent 用時，旁邊那個 ↗ 連結才是給它的。
 */
export function AiMarkdownButton({
  articleId,
  className = "",
}: {
  articleId: number;
  className?: string;
}) {
  const [state, setState] = useState<State>("idle");

  const url = `${API_BASE}/api/articles/${articleId}/markdown`;

  async function copy(e: React.MouseEvent) {
    // 卡片整張被 <Link> 包住，不擋掉的話點 icon 會連帶跳去文章頁。
    e.preventDefault();
    e.stopPropagation();

    setState("loading");
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      await navigator.clipboard.writeText(await res.text());
      setState("copied");
      setTimeout(() => setState("idle"), 1800);
    } catch {
      // 失敗不要靜靜地當作成功——使用者會以為複製到了，貼出來卻是空的。
      setState("error");
      setTimeout(() => setState("idle"), 2500);
    }
  }

  const label =
    state === "copied"
      ? "已複製 Markdown"
      : state === "error"
        ? "複製失敗"
        : "複製 Markdown 給 AI";

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      <button
        type="button"
        onClick={copy}
        aria-label={label}
        title={label}
        disabled={state === "loading"}
        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-mono transition-colors hover:opacity-100 opacity-60"
        style={{ color: "var(--color-text-muted)" }}
      >
        <AiGlyph state={state} />
        <span>{state === "copied" ? "已複製" : "AI"}</span>
      </button>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        aria-label="以 Markdown 純文字開啟（AI 可讀格式）"
        title="以 Markdown 純文字開啟（AI 可讀格式）"
        className="text-[11px] opacity-40 hover:opacity-80 transition-opacity"
        style={{ color: "var(--color-text-muted)" }}
      >
        ↗
      </a>
    </span>
  );
}

function AiGlyph({ state }: { state: State }) {
  if (state === "copied") {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }
  // 兩張疊起來的紙 = 複製；這是使用者對「複製」最沒有歧義的既有圖像。
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
