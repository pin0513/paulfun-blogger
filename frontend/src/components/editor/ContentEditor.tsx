"use client";

import { useState, useEffect, useRef } from "react";
import { TiptapEditor, type TiptapEditorProps } from "./TiptapEditor";
import { buildPreviewDocument } from "./previewDocument";

type ContentEditorProps = TiptapEditorProps;

type Tab = "edit" | "preview";

/**
 * 偵測內容是否含有 Tiptap schema 外的 HTML（自訂排版 / inline style / SVG）。
 *
 * Tiptap 的 StarterKit 只認得段落、標題、清單、引用、程式碼、連結、圖片。
 * 含這些標籤的內容若經 Tiptap round-trip 儲存，自訂排版會被正規化掉。
 */
function containsRawHtml(html: string): boolean {
  return (
    /<(div|section|article|style|svg|table)[\s>]/i.test(html) ||
    /\sstyle="/i.test(html)
  );
}

/**
 * 文章內容編輯器：包一層「編輯 / 預覽」分頁。
 *
 * - 編輯分頁：Tiptap 結構化編輯器（schema 外的標籤會被正規化）。
 * - 預覽分頁：iframe 直接渲染原始 HTML，重現前台 prose-article 環境，
 *   繞過 Tiptap，讓貼入的圖解類 HTML（div / inline style / SVG）如實呈現。
 *
 * 載入既有的原始 HTML 文章時，預設停在預覽分頁，並在編輯分頁顯示警告。
 */
export function ContentEditor(props: ContentEditorProps) {
  const { content } = props;
  const [tab, setTab] = useState<Tab>("edit");
  const isRawHtml = containsRawHtml(content);

  // content 由父層非同步載入。第一次拿到非空內容時，
  // 若判定為原始 HTML 文章，自動切到預覽分頁。
  const autoTabDecided = useRef(false);
  useEffect(() => {
    if (autoTabDecided.current) return;
    if (!content.trim()) return;
    autoTabDecided.current = true;
    if (containsRawHtml(content)) setTab("preview");
  }, [content]);

  return (
    <div className="card p-0">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
        <label className="block text-sm font-medium text-text">
          內容 <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center rounded-md border border-border overflow-hidden text-sm">
          <TabButton active={tab === "edit"} onClick={() => setTab("edit")}>
            編輯
          </TabButton>
          <TabButton
            active={tab === "preview"}
            onClick={() => setTab("preview")}
          >
            預覽
          </TabButton>
        </div>
      </div>

      {/* 兩個分頁都保留在 DOM，只切換顯示，避免切回編輯時 Tiptap 重新初始化 */}
      <div className={tab === "edit" ? "" : "hidden"}>
        {isRawHtml && <RawHtmlWarning />}
        <TiptapEditor {...props} />
      </div>
      <div className={tab === "preview" ? "" : "hidden"}>
        <ContentPreview content={content} />
      </div>
    </div>
  );
}

/** 含原始 HTML 時的編輯分頁警告：提醒用 Tiptap 儲存會破壞排版。 */
function RawHtmlWarning() {
  return (
    <div className="m-4 mb-0 p-3 rounded-md bg-amber-500/10 border border-amber-500/40 text-amber-600 dark:text-amber-400 text-sm leading-relaxed">
      <strong>⚠️ 這篇含有編輯器不支援的 HTML</strong>（自訂
      <code className="mx-1 px-1 rounded bg-amber-500/15">div</code>、inline
      style、SVG 等）。
      <br />
      在此用編輯器修改並「儲存變更」會把版面<strong>簡化、破壞原本排版</strong>。
      請改用「預覽」分頁確認呈現，需要改內容時直接以 API 更新文章。
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 transition-colors ${
        active
          ? "bg-primary text-white"
          : "bg-surface text-text-muted hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * iframe 預覽：用 srcDoc 渲染完整 HTML 文件，重現前台閱讀環境。
 * 高度由 iframe 內嵌 script 量測後 postMessage 回傳，隨內容自適應。
 */
function ContentPreview({ content }: { content: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(480);
  const [isDark, setIsDark] = useState(false);

  // 跟隨 admin 介面當前主題（light / dark）
  useEffect(() => {
    const read = () =>
      setIsDark(document.documentElement.classList.contains("dark"));
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  // 接收 iframe 量測後回傳的高度
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (
        e.data?.type === "preview-height" &&
        typeof e.data.height === "number"
      ) {
        setHeight(Math.max(240, Math.ceil(e.data.height)));
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const srcDoc = content.trim() ? buildPreviewDocument(content, isDark) : "";

  if (!srcDoc) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-text-muted text-sm">
        尚無內容可預覽
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      title="文章預覽"
      srcDoc={srcDoc}
      className="w-full block"
      style={{ height, border: "none" }}
    />
  );
}

export type { ContentEditorProps };
