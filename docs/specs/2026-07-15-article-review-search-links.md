# 文章回顧檢索 + 知識串連 API（2026-07-15）

## 需求

寫新文章前需要「回顧既有文章」：
1. **多條件全文檢索** — 快速過濾 200+ 篇既有文章（多關鍵字、欄位限定、日期、狀態），避免重發既有知識
2. **知識串連** — 文章之間建立顯式關聯（相關 related / 演進系列 series），支援「三部曲」這種演進脈絡的整理與呈現

現況缺口：既有 `GET /api/articles` 只支援單一關鍵字 ILIKE（title+summary+content 全包）、單一 category/tag；文章互連機制完全不存在。

## 1. 回顧檢索 API

### `GET /api/admin/articles/search`（需 admin JWT）

放 admin 是因為回顧場景需要含草稿；公開端不動。

| 參數 | 型別 | 預設 | 說明 |
|---|---|---|---|
| `q` | string | 必填 | 多關鍵字，**空白分隔**，每個詞獨立 ILIKE |
| `mode` | `and`/`or` | `and` | 多關鍵字的組合邏輯 |
| `fields` | csv | `title,summary,content` | 檢索欄位限定，如 `fields=title,summary` |
| `status` | string | （全部） | `draft` / `scheduled` / `published` |
| `categoryIds` | csv | — | 多分類 OR，如 `1,5,26` |
| `tagIds` | csv | — | 多標籤 OR（任一命中） |
| `dateField` | `created`/`published` | `created` | 日期範圍作用欄位 |
| `dateFrom` / `dateTo` | `YYYY-MM-DD` | — | 日期範圍（含當天） |
| `page` / `pageSize` / `sortBy` / `descending` | — | 同既有 | 沿用既有分頁排序 |

### 回應

沿用 `PagedResponse`，item = 既有 ArticleListItemDto **加兩個欄位**：

```json
{
  "snippet": "…前後文 60 字，命中詞以【】標記…",
  "matchedFields": ["title", "content"]
}
```

- `snippet`：content 去除 HTML tag 後，取第一個命中關鍵字前後各 60 字；content 沒命中則取 summary 或 content 開頭
- 語意：`q=AI 品質 mode=and` = 「同時包含 AI 與品質」；`mode=or` = 「包含任一」

### 契約（Design by Contract）

- Pre：`q` 去空白後至少 1 個詞，否則 422；`pageSize` ≤ 100
- Post：回傳 items 中每篇必然滿足 mode 邏輯（AND：每個詞至少命中一個限定欄位；OR：至少一詞命中）
- Invariant：不論任何參數組合，此 endpoint 為唯讀，不改任何資料

## 2. 知識串連 API

### Model：`ArticleLink`

| 欄位 | 型別 | 說明 |
|---|---|---|
| `id` | uint PK | |
| `from_article_id` | uint, index | 起點文章 |
| `to_article_id` | uint, index | 終點文章 |
| `relation` | string(20) | `related`（相關）/ `series`（演進：from 承接 to，from 較新） |
| `note` | string(200), nullable | 說明，如「第 2 部：從閘門到流程」 |
| `created_at` | timestamp | |

約束：
- unique index `(from_article_id, to_article_id, relation)` — 防重複
- 禁止 self-link（service 層擋，422）
- 兩端文章必須存在（FK + service 驗證）
- 刪文章時串接既有 delete transaction 一併清 links（防 FK violation，比照 article_tags 前例）

### series 的方向語意

`series` link 一律「新 → 舊」（from 承接 to）。三部曲 = 鏈：`第3部 →series→ 第2部 →series→ 第1部`。
查詢時從任一篇沿鏈雙向走訪，重建完整系列（按時間排序）。走訪深度上限 20（防環；建立時亦檢查不得成環）。

### Endpoints

| Method | Path | 說明 |
|---|---|---|
| `GET` | `/api/admin/articles/:id/links` | 該文所有 links（含 incoming / outgoing，附兩端文章摘要） |
| `POST` | `/api/admin/articles/:id/links` | body: `{toArticleId, relation, note}`；`:id` 為 from |
| `DELETE` | `/api/admin/articles/:id/links/:linkId` | 刪單一 link |
| `GET` | `/api/articles/:id/related` | **公開**。回 `{series: [...], related: [...]}`，只含 published 文章 |

公開端回應：

```json
{
  "success": true,
  "data": {
    "series": [
      { "id": 192, "title": "...", "slug": "...", "publishedAt": "...", "note": "第 1 部", "isCurrent": false },
      { "id": 239, "title": "...", "isCurrent": true }
    ],
    "related": [ { "id": 218, "title": "...", "note": "…" } ]
  }
}
```

- `series`：完整鏈、舊 → 新排序、含當前文章（`isCurrent` 標記）
- `related`：雙向收集（A→B 或 B→A 都算），去重
- 未發佈文章在公開端一律濾除（草稿被串連不外洩）

## 3. 前端呈現

文章詳情頁底部新增區塊（有資料才渲染）：
- **📖 系列文章**：垂直時間線列出整個系列，當前篇高亮
- **🔗 相關文章**：卡片列表

## 4. 不做的事

- 不做 PostgreSQL full-text index（tsvector 對中文分詞支援差；200 篇規模 ILIKE 足夠，> 2000 篇再評估 pg_trgm / bigram gin index）
- 不做 admin UI 的 link 管理介面（先用 API 操作，需求穩定再補 UI）
- 不做自動推薦相關文章（顯式人工串連優先，語意推薦屬 RAG 範疇另案）

## 5. 驗證

1. 本機 dev DB：search 各參數組合（and/or、fields、日期、多 tag）+ 邊界（q 空 → 422、pageSize>100 截斷）
2. links：建立 192←218←239 series 鏈 + 一條 related；`GET /api/articles/239/related` 驗證鏈完整、順序正確；self-link / 重複 / 成環 → 422
3. 刪除有 link 的文章不噴 FK violation
4. push 後由 CI 自動部署，production 冒煙測試同上關鍵路徑
