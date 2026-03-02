# Skill: 發佈文章到 PaulFun Blog v2

## 概述

透過 PaulFun Blogger v2 REST API，將文章發佈到 `https://paulfun.net`。
支援：建立草稿、上傳封面圖、設定分類/標籤、立即發佈、排程發佈、批次匯入。

---

## 連線資訊

| 項目 | 值 |
|------|-----|
| Base URL | `https://paulfun.net` |
| 圖片 CDN | `https://img.paulfun.net` |
| 認證方式 | Bearer Token (JWT, 24h) |

---

## 快速開始：完整發文流程

### Step 1 — 登入取得 Token

```bash
curl -s -X POST https://paulfun.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"pin0513@gmail.com","password":"Test1234"}'
```

回應：
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "user": { "id": 1, "displayName": "Paul", "role": "admin" }
  }
}
```

> 後續所有 `/api/admin/*` 請求都帶 `Authorization: Bearer {token}`

### Step 2 — 上傳封面圖（可選）

```bash
curl -s -X POST https://paulfun.net/api/admin/media/upload \
  -H "Authorization: Bearer {token}" \
  -F "file=@cover.png"
```

回應：
```json
{
  "success": true,
  "data": {
    "url": "https://img.paulfun.net/uploads/2026/03/uuid.png"
  }
}
```

- 允許格式：JPEG, PNG, GIF, WebP, SVG
- 大小限制：5MB
- Content-Type: `multipart/form-data`

### Step 3 — 建立文章（草稿）

```bash
curl -s -X POST https://paulfun.net/api/admin/articles \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "文章標題",
    "summary": "一段簡短摘要，顯示在列表頁",
    "content": "<h2>章節標題</h2><p>內文 HTML</p>",
    "coverImage": "https://img.paulfun.net/uploads/2026/03/uuid.png",
    "categoryId": 1,
    "tagIds": [7, 25]
  }'
```

回應：
```json
{
  "success": true,
  "data": { "id": 126, "slug": "文章標題", "status": "draft" }
}
```

| 欄位 | 必填 | 說明 |
|------|------|------|
| `title` | 必填 | 標題，max 500 字元 |
| `summary` | 選填 | 摘要，顯示在文章列表卡片 |
| `content` | 選填 | 內文，**HTML 格式** |
| `coverImage` | 選填 | 封面圖 URL（建議用 Step 2 上傳的） |
| `categoryId` | 選填 | 分類 ID（見下方分類表） |
| `tagIds` | 選填 | 標籤 ID 陣列（見下方標籤表） |

### Step 4 — 發佈

```bash
# 立即發佈
curl -s -X POST https://paulfun.net/api/admin/articles/{id}/publish \
  -H "Authorization: Bearer {token}"

# 排程發佈（指定未來時間）
curl -s -X POST https://paulfun.net/api/admin/articles/{id}/publish \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"scheduledAt": "2026-03-10T09:00:00Z"}'
```

---

## 批次匯入（一步到位）

不需要分步驟，一次 API call 完成建立 + 發佈：

```bash
curl -s -X POST https://paulfun.net/api/admin/import/articles \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "articles": [
      {
        "title": "文章標題",
        "summary": "摘要",
        "content": "<h2>標題</h2><p>內文</p>",
        "coverImage": "https://img.paulfun.net/uploads/covers/AI.png",
        "categorySlug": "tech",
        "tagSlugs": ["go", "docker"],
        "publish": true,
        "publishedAt": "2026-03-02T12:00:00Z"
      }
    ],
    "update": false
  }'
```

| 欄位 | 說明 |
|------|------|
| `categorySlug` | 用分類的 slug（見下方分類表） |
| `tagSlugs` | 用標籤的 slug 陣列（見下方標籤表） |
| `publish` | `true` = 發佈, `false` = 草稿 |
| `publishedAt` | 發佈時間，省略 = 當下時間 |
| `update` | `true` = slug 重複時更新內容；`false` = 跳過 |

---

## 其他管理操作

### 更新文章

```bash
curl -s -X PUT https://paulfun.net/api/admin/articles/{id} \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "更新後標題",
    "content": "<p>更新後內容</p>",
    "categoryId": 5,
    "tagIds": [7, 25, 55]
  }'
```

### 取消發佈（退回草稿）

```bash
curl -s -X POST https://paulfun.net/api/admin/articles/{id}/unpublish \
  -H "Authorization: Bearer {token}"
```

### 刪除文章

```bash
curl -s -X DELETE https://paulfun.net/api/admin/articles/{id} \
  -H "Authorization: Bearer {token}"
```

### 查詢管理文章列表（含草稿）

```bash
curl -s "https://paulfun.net/api/admin/articles?page=1&pageSize=20&status=draft" \
  -H "Authorization: Bearer {token}"
```

支援篩選：`status=draft|scheduled|published`, `categoryId`, `tagId`, `search`

---

## 內容格式指南

### HTML 內容結構

文章 `content` 使用 HTML 格式（前端用 Tiptap 編輯器）。建議結構：

```html
<h2>章節標題</h2>
<p>段落內文，支援 <strong>粗體</strong>、<em>斜體</em>、<code>行內程式碼</code>。</p>

<h3>子標題</h3>
<p>更多內容...</p>

<pre><code class="language-go">// 程式碼區塊
func main() {
    fmt.Println("Hello")
}
</code></pre>

<ul>
  <li>列表項目 1</li>
  <li>列表項目 2</li>
</ul>

<ol>
  <li>有序列表 1</li>
  <li>有序列表 2</li>
</ol>

<blockquote><p>引用文字</p></blockquote>

<p>圖片（使用 R2 CDN URL）：</p>
<img src="https://img.paulfun.net/uploads/2026/03/uuid.png" alt="說明文字" />

<a href="https://example.com">連結文字</a>
```

### 內嵌圖片流程

1. 先用 `/api/admin/media/upload` 上傳圖片
2. 取得回傳的 `url`
3. 在 content HTML 中使用 `<img src="{url}" alt="..." />`

---

## 現有分類（Categories）

| ID | 名稱 | Slug | 文章數 |
|----|------|------|--------|
| 1 | 技術 | `tech` | 1 |
| 5 | AI | `ai` | 11 |
| 6 | Agile | `agile` | 1 |
| 7 | Azure | `azure` | 1 |
| 8 | Azure Functions | `azure-functions` | 1 |
| 9 | C# | `c` | 3 |
| 10 | DesignPattern | `designpattern` | 2 |
| 11 | GCP | `gcp` | 1 |
| 12 | LeetCode | `leetcode` | 11 |
| 13 | React | `react` | 5 |
| 14 | 我的python食譜 | `我的python食譜` | 12 |
| 15 | 我的安裝食譜 | `我的安裝食譜` | 31 |
| 16 | 我的待閱讀 | `我的待閱讀` | 1 |
| 17 | 我的測試食譜 | `我的測試食譜` | 6 |
| 18 | 我的除錯食譜 | `我的除錯食譜` | 2 |
| 19 | 架構設計 | `架構設計` | 3 |
| 20 | 演算法 | `演算法` | 1 |
| 21 | 物件導向設計模式摘要 | `物件導向設計模式摘要` | 2 |
| 23 | 維運日誌 | `維運日誌` | 6 |
| 24 | 聽心得 | `聽心得` | 1 |
| 2 | 生活 | `life` | 0 |
| 3 | 旅遊 | `travel` | 0 |
| 4 | 閱讀 | `reading` | 0 |
| 22 | 管理 | `管理` | 0 |

> 若需新分類，可用批次匯入 API 建立：
> ```bash
> curl -s -X POST https://paulfun.net/api/admin/import/categories \
>   -H "Authorization: Bearer {token}" \
>   -H "Content-Type: application/json" \
>   -d '{"categories": [{"name": "新分類", "slug": "new-cat"}]}'
> ```

---

## 常用標籤（Tags）

| ID | 名稱 | Slug |
|----|------|------|
| 7 | Go | `go` |
| 55 | Python | `python` |
| 1 | C# | `csharp` |
| 2 | .NET | `dotnet` |
| 3 | React | `react` |
| 4 | TypeScript | `typescript` |
| 5 | Next.js | `nextjs` |
| 25 | Docker | `docker` |
| 26 | Docker-Compose | `docker-compose` |
| 33 | Git | `git` |
| 41 | Linux | `linux` |
| 48 | Nginx | `nginx` |
| 40 | LeetCode | `leetcode` |
| 72 | azure | `azure` |
| 79 | gcp | `gcp` |
| 76 | devops | `devops` |
| 63 | Testing | `testing` |
| 87 | playwright | `playwright` |
| 23 | Design Pattern | `design-pattern` |
| 21 | Clean Architecture | `clean-architecture` |
| 11 | Agile | `agile` |
| 59 | Scrum | `scrum` |
| 60 | Security | `security` |
| 29 | Elasticsearch | `elasticsearch` |
| 61 | Sql Server | `sql-server` |
| 45 | MSSQL | `mssql` |
| 6 | 隨筆 | `essay` |
| 93 | 設計模式 | `設計模式` |

> 完整標籤清單可查詢：`GET https://paulfun.net/api/articles/tags`
>
> 若需新標籤，可用批次匯入 API 建立：
> ```bash
> curl -s -X POST https://paulfun.net/api/admin/import/tags \
>   -H "Authorization: Bearer {token}" \
>   -H "Content-Type: application/json" \
>   -d '{"tags": [{"name": "Kubernetes", "slug": "kubernetes"}]}'
> ```

---

## 封面圖參考

現有封面圖可直接使用（R2 CDN）：

| 主題 | URL |
|------|-----|
| AI | `https://img.paulfun.net/uploads/covers/AI.png` |
| React | `https://img.paulfun.net/uploads/covers/React.png` |
| C# | `https://img.paulfun.net/uploads/covers/C%23.png` |
| GCP | `https://img.paulfun.net/uploads/covers/GCP.png` |
| Azure | `https://img.paulfun.net/uploads/covers/Azure.png` |
| Azure Functions | `https://img.paulfun.net/uploads/covers/Azure_Functions.png` |
| Agile | `https://img.paulfun.net/uploads/covers/Agile.png` |
| LeetCode | `https://img.paulfun.net/uploads/covers/LeetCode.png` |
| DesignPattern | `https://img.paulfun.net/uploads/covers/DesignPattern.png` |
| 技術 | `https://img.paulfun.net/uploads/covers/%E6%8A%80%E8%A1%93.png` |
| 架構設計 | `https://img.paulfun.net/uploads/covers/%E6%9E%B6%E6%A7%8B%E8%A8%AD%E8%A8%88.png` |
| 演算法 | `https://img.paulfun.net/uploads/covers/%E6%BC%94%E7%AE%97%E6%B3%95.png` |
| 我的python食譜 | `https://img.paulfun.net/uploads/covers/%E6%88%91%E7%9A%84python%E9%A3%9F%E8%AD%9C.png` |
| 我的安裝食譜 | `https://img.paulfun.net/uploads/covers/%E6%88%91%E7%9A%84%E5%AE%89%E8%A3%9D%E9%A3%9F%E8%AD%9C.png` |
| 我的測試食譜 | `https://img.paulfun.net/uploads/covers/%E6%88%91%E7%9A%84%E6%B8%AC%E8%A9%A6%E9%A3%9F%E8%AD%9C.png` |
| 我的除錯食譜 | `https://img.paulfun.net/uploads/covers/%E6%88%91%E7%9A%84%E9%99%A4%E9%8C%AF%E9%A3%9F%E8%AD%9C.png` |
| 維運日誌 | `https://img.paulfun.net/uploads/covers/%E7%B6%AD%E9%81%8B%E6%97%A5%E8%AA%8C.png` |
| 聽心得 | `https://img.paulfun.net/uploads/covers/%E8%81%BD%E5%BF%83%E5%BE%97.png` |
| 預設 | `https://img.paulfun.net/uploads/covers/default.png` |

---

## 統一回應格式

所有 API 回應：
```json
{ "success": boolean, "data": any, "message": "string" }
```

分頁回應：
```json
{
  "data": {
    "items": [],
    "totalCount": 100,
    "page": 1,
    "pageSize": 10,
    "totalPages": 10,
    "hasPreviousPage": false,
    "hasNextPage": true
  }
}
```

### 常見錯誤

| HTTP | 情境 | message |
|------|------|---------|
| 400 | 請求格式錯誤 | `請求格式錯誤: ...` |
| 401 | Token 缺失或過期 | `未提供 Authorization token` / `Token 無效或已過期` |
| 403 | 權限不足 | `權限不足` |
| 404 | 資源不存在 | `文章不存在` |
| 422 | 登入失敗 | `帳號或密碼錯誤` |

---

## AI 發文 Prompt 建議

當使用者說「幫我發一篇文章到 blog」時，AI 應：

1. **確認文章內容**：標題、摘要、內文（或請使用者提供）
2. **選擇分類**：根據主題從上方分類表選擇最適合的 categoryId
3. **選擇標籤**：根據內容關鍵字從上方標籤表選擇相關 tagIds
4. **選擇封面圖**：根據分類從封面圖參考表選擇，或上傳新圖
5. **確認發佈方式**：立即發佈 or 草稿 or 排程
6. **執行 API 呼叫**：
   - 登入 → 取 token
   - （可選）上傳封面圖 → 取 url
   - 建立文章 → 取 article id
   - 發佈文章
7. **回報結果**：提供文章 URL `https://paulfun.net/articles/{id}`
