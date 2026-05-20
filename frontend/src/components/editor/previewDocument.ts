/**
 * 組出 iframe 預覽用的完整 HTML 文件。
 *
 * 目的：在後台重現前台 `ArticleContent` 的閱讀環境 —— 同樣的 CSS 變數、
 * 同樣的 `prose-article` 排版、同樣的 light / dark 主題，讓貼入的原始 HTML
 * （含 div / inline style / SVG 的圖解類文章）如實呈現，不經過 Tiptap 正規化。
 *
 * prose-article 規則與顏色變數需與 `src/app/globals.css` 保持一致。
 */

/** 顏色變數 — 對應 globals.css 的 :root（light）與 .dark（dark）。 */
const THEME_VARS = `
:root{
  --color-bg:#f9f8f6;--color-bg-secondary:#f5f4f2;--color-surface:#ffffff;
  --color-text:#333333;--color-text-secondary:#555555;--color-text-muted:#999999;
  --color-primary:#326891;--color-accent:#121212;--color-border:#dddddd;
  --color-code-bg:#f5f4f2;--article-font-size:20px;
}
.dark{
  --color-bg:#0A0A0F;--color-bg-secondary:#131322;--color-surface:#1A1A2E;
  --color-text:#E4E4E7;--color-text-secondary:#A1A1AA;--color-text-muted:#71717A;
  --color-primary:#00D4FF;--color-accent:#FF006E;--color-border:#27273A;
  --color-code-bg:#12121F;
}`;

/** prose-article 排版 — 複製自 globals.css，供 iframe 內獨立使用。 */
const PROSE_CSS = `
.prose-article{
  font-family:'Huninn','Noto Serif TC',Georgia,serif;
  font-size:var(--article-font-size,20px);line-height:1.8;font-weight:400;
  color:var(--color-text);max-width:720px;margin:0 auto;
}
.dark .prose-article{line-height:1.72;}
.prose-article h1,.prose-article h2,.prose-article h3{
  font-family:'Huninn','Noto Sans TC',sans-serif;font-weight:600;color:var(--color-text);
}
.dark .prose-article h1,.dark .prose-article h2,.dark .prose-article h3{font-weight:700;}
.prose-article h1{font-size:30px;line-height:1.3;margin:56px 0 20px;}
.prose-article h2{font-size:26px;line-height:1.35;margin:48px 0 16px;}
.prose-article h3{font-size:22px;line-height:1.4;margin:40px 0 12px;}
.prose-article p{margin-bottom:32px;}
.prose-article a{color:var(--color-primary);text-decoration:underline;text-underline-offset:3px;}
.prose-article blockquote{
  border-left:3px solid var(--color-accent);padding:16px 20px;
  background:var(--color-bg-secondary);font-style:italic;
  color:var(--color-text-secondary);margin:32px 0;
}
.dark .prose-article blockquote{
  border-left-color:var(--color-primary);background:transparent;padding:0 0 0 20px;
}
.prose-article code{
  background:var(--color-code-bg);padding:2px 6px;border-radius:4px;
  font-size:0.9em;font-family:'JetBrains Mono',monospace;
}
.prose-article pre{
  background:var(--color-code-bg);padding:20px;border-radius:8px;overflow-x:auto;
  margin:32px 0;font-size:15px;line-height:1.6;border:1px solid var(--color-border);
}
.prose-article pre code{background:transparent;padding:0;border-radius:0;font-size:inherit;}
.prose-article img{border-radius:8px;margin:32px 0;max-width:100%;}
.prose-article ul,.prose-article ol{margin:24px 0;padding-left:24px;}
.prose-article li{margin-bottom:8px;}
.prose-article li::marker{color:var(--color-primary);}
.prose-article hr{border-color:var(--color-border);margin:48px 0;}
.prose-article table{width:100%;border-collapse:collapse;margin:32px 0;}
.prose-article th,.prose-article td{padding:10px 16px;border:1px solid var(--color-border);text-align:left;}
.prose-article th{background:var(--color-surface);font-weight:600;font-family:'Inter','Noto Sans TC',sans-serif;}`;

/**
 * iframe 高度量測：載入完成、字型就緒、內容尺寸變動時，
 * 把實際高度 postMessage 給父視窗，讓 iframe 高度隨內容自適應。
 */
const HEIGHT_SCRIPT = `
(function(){
  function post(){
    parent.postMessage({type:'preview-height',height:document.documentElement.scrollHeight},'*');
  }
  window.addEventListener('load',post);
  if(document.fonts&&document.fonts.ready){document.fonts.ready.then(post);}
  if(window.ResizeObserver){new ResizeObserver(post).observe(document.body);}
  setTimeout(post,120);setTimeout(post,600);
})();`;

const FONT_LINK =
  "https://fonts.googleapis.com/css2?family=Huninn&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Noto+Sans+TC:wght@300;400;500;700&family=Noto+Serif+TC:wght@400;500;600;700&display=swap";

/**
 * @param content  文章原始 HTML（DB 內容，未經 Tiptap 處理）
 * @param isDark   是否套用深色主題（跟隨 admin 介面）
 */
export function buildPreviewDocument(content: string, isDark: boolean): string {
  return `<!DOCTYPE html>
<html lang="zh-TW" class="${isDark ? "dark" : ""}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="${FONT_LINK}">
<style>
${THEME_VARS}
${PROSE_CSS}
html,body{margin:0;}
body{background:var(--color-bg);padding:24px 16px;}
</style>
</head>
<body>
<article class="prose-article">${content}</article>
<script>${HEIGHT_SCRIPT}</script>
</body>
</html>`;
}
