# PaulFun Blogger

個人部落格系統，前後端分離架構。

## 專案結構

```
/paulfun-blogger/
├── .github/workflows/     # CI/CD Pipeline
├── backend-go/            # Go 1.22 後端（主要）
│   ├── cmd/server/main.go
│   ├── internal/          # config, models, db, dto, middleware, handlers, services, router
│   ├── uploads/           # 媒體上傳目錄（volume mount）
│   ├── go.mod
│   └── Dockerfile
├── backend/               # .NET 8 後端（已棄用，保留參考）
│   └── PaulFunBlogger.Api/
├── frontend/              # Next.js 14 前端
│   └── e2e/               # Playwright E2E 測試
├── docker/                # Docker 相關設定
├── docker-compose.dev.yml # 本地開發環境（PostgreSQL）
├── docker-compose.prod.yml # GCP 生產環境
├── docker-compose.yml     # 完整環境（舊 .NET 版，保留參考）
└── README.md
```

## 技術棧

| 層級 | 技術 |
|------|------|
| 前端 | Next.js 14 (App Router) + TailwindCSS + Jotai + Tiptap |
| 後端 | Go 1.22 + Gin + GORM |
| 資料庫 | PostgreSQL 16 Alpine |
| 部署 | GCP Compute Engine (VM) + Docker Compose |

## 測試帳號（預設 Seed 資料）

| 項目 | 內容 |
|------|------|
| Email | `pin0513@gmail.com` |
| 密碼 | `Test1234` |
| 角色 | admin（完整後台權限）|

> 首次啟動 Go server 時，若資料庫為空，會自動執行 `db/seed.go` 建立上述帳號與預設分類/標籤/文章。

## 開發指令

### 後端（Go）

```bash
cd backend-go
cp .env.example .env   # 首次需複製設定檔
go run ./cmd/server/main.go
```

### 前端

```bash
cd frontend
npm run dev
```

### Docker 開發環境（PostgreSQL）

```bash
# 啟動 PostgreSQL
docker-compose -f docker-compose.dev.yml up -d

# 查看 log
docker-compose -f docker-compose.dev.yml logs -f

# 停止
docker-compose -f docker-compose.dev.yml down
```

### Port 對應

| 服務 | Port |
|------|------|
| Next.js 前端 | `3000` |
| Go API server | `5266`（docker: 5266:8080）|
| PostgreSQL | `5433`（docker: 5433:5432，避免與本機衝突）|

## API 端點完整文件

生產環境 Base URL: `https://paulfun.net`
本地開發 Base URL: `http://localhost:5266`（透過 docker）或 `http://localhost:8080`（直接執行 Go）

### 統一回應格式

```json
{
  "success": boolean,
  "data": object | array | null,
  "message": "string"
}
```

分頁回應：
```json
{
  "success": true,
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

### 認證方式

所有 `/api/admin/*` 端點需要 `Authorization: Bearer {token}` header。
Token 透過登入取得，有效期預設 24 小時（HS256 JWT）。

---

### 1. 認證 API

#### POST `/api/auth/login` — 登入

```json
// Request
{ "email": "pin0513@gmail.com", "password": "Test1234" }

// Response 200
{
  "success": true,
  "message": "登入成功",
  "data": {
    "token": "eyJhbGc...",
    "refreshToken": "base64-token",
    "user": { "id": 1, "email": "...", "displayName": "...", "avatar": null, "role": "admin" }
  }
}
```

#### POST `/api/auth/register` — 註冊

```json
// Request
{ "email": "new@example.com", "password": "123456", "displayName": "新用戶" }
// password 最少 6 字元，email 不可重複（409）
// Response 201（同 login 格式），預設 role = "user"
```

#### GET `/api/auth/me` — 取得當前用戶（需 Bearer token）

```json
// Response 200
{ "success": true, "data": { "id": 1, "email": "...", "displayName": "...", "role": "admin" } }
```

---

### 2. 文章 API（公開）

#### GET `/api/articles` — 文章列表（僅已發佈）

| 參數 | 型別 | 預設 | 說明 |
|------|------|------|------|
| `page` | int | 1 | 頁碼 |
| `pageSize` | int | 10 | 每頁筆數（max 100） |
| `sortBy` | string | createdAt | 排序：`createdAt`, `title`, `publishedAt`, `viewCount` |
| `descending` | bool | true | 降冪排序 |
| `categoryId` | int | - | 依分類篩選 |
| `tagId` | int | - | 依標籤篩選 |
| `search` | string | - | 搜尋標題/摘要/內容 |

回應含 `items[]`，每筆包含 `id, title, slug, summary, coverImage, category, author, status, publishedAt, viewCount, tags[], createdAt`。**不含 content**。

#### GET `/api/articles/:id` — 文章詳情

回應含完整 `content`（HTML）。每次存取自動增加 `viewCount`。

#### GET `/api/articles/categories` — 分類列表（含文章數）

```json
{ "data": [{ "id": 1, "name": "技術", "slug": "tech", "parentId": null, "sortOrder": 0, "articleCount": 5 }] }
```

#### GET `/api/articles/tags` — 標籤列表

```json
{ "data": [{ "id": 1, "name": "Go", "slug": "go" }] }
```

---

### 3. 文章管理 API（需 Bearer token）

#### GET `/api/admin/articles` — 管理文章列表（含草稿/排程）

同公開列表參數，額外支援 `status` 篩選（`draft`, `scheduled`, `published`）。

#### GET `/api/admin/articles/:id` — 取得單篇文章（任何狀態）

#### POST `/api/admin/articles` — 建立文章（草稿）

```json
// Request
{
  "title": "文章標題",           // 必填，max 500
  "summary": "摘要",             // 選填
  "content": "<p>HTML內容</p>",  // 選填
  "coverImage": "https://img.paulfun.net/uploads/covers/AI.png",  // 選填
  "categoryId": 1,               // 選填，需存在
  "tagIds": [1, 2, 3]            // 選填，需存在
}

// Response 201
{ "success": true, "message": "文章建立成功", "data": { "id": 5, "slug": "文章標題", "status": "draft", ... } }
```

- `slug` 自動從 title 產生（小寫、去特殊字元、空格轉 `-`），重複時加 `-1`, `-2`
- 建立後狀態為 `draft`

#### PUT `/api/admin/articles/:id` — 更新文章

Request body 同 POST，更新 `updatedAt` 和 `version`（樂觀鎖）。

#### DELETE `/api/admin/articles/:id` — 刪除文章

#### POST `/api/admin/articles/:id/publish` — 發佈文章

```json
// 立即發佈（不帶 body 或空 body）
{}

// 排程發佈
{ "scheduledAt": "2026-03-05T14:00:00Z" }
```

- 無 `scheduledAt` → status = `published`, publishedAt = 現在
- 有 `scheduledAt` → status = `scheduled`, publishedAt = 指定時間

#### POST `/api/admin/articles/:id/unpublish` — 取消發佈

將文章退回 `draft` 狀態，清除 `publishedAt`。

---

### 4. 媒體上傳 API（需 Bearer token）

#### POST `/api/admin/media/upload` — 上傳圖片

```bash
curl -X POST https://paulfun.net/api/admin/media/upload \
  -H "Authorization: Bearer {token}" \
  -F "file=@/path/to/image.jpg"
```

- **Content-Type**: multipart/form-data
- **允許格式**: JPEG, PNG, GIF, WebP, SVG
- **大小限制**: 5MB
- **儲存路徑**: `uploads/{YYYY}/{MM}/{uuid}.{ext}`

```json
// Response 200
{
  "success": true,
  "message": "上傳成功",
  "data": {
    "id": 1,
    "fileName": "image.jpg",
    "url": "https://img.paulfun.net/uploads/2026/03/550e8400-e29b-41d4-a716-446655440000.jpg",
    "fileSize": 102400,
    "mimeType": "image/jpeg"
  }
}
```

#### GET `/api/admin/media` — 媒體列表

| 參數 | 型別 | 預設 | 說明 |
|------|------|------|------|
| `page` | int | 1 | 頁碼 |
| `pageSize` | int | 20 | 每頁筆數（max 100） |
| `mimeType` | string | - | 篩選類型前綴（如 `image`） |
| `search` | string | - | 搜尋檔名 |

#### DELETE `/api/admin/media/:id` — 刪除媒體

---

### 5. 批次匯入 API（需 Bearer token）

#### POST `/api/admin/import/categories` — 批次匯入分類

```json
{
  "categories": [
    { "name": "技術", "slug": "tech", "sortOrder": 1 },
    { "name": "生活", "slug": "life", "sortOrder": 2 }
  ]
}
```

slug 重複則跳過（不覆蓋）。

#### POST `/api/admin/import/tags` — 批次匯入標籤

```json
{
  "tags": [
    { "name": "Go", "slug": "go" },
    { "name": "Docker", "slug": "docker" }
  ]
}
```

#### POST `/api/admin/import/articles` — 批次匯入文章

```json
{
  "articles": [
    {
      "title": "文章標題",
      "slug": "article-slug",
      "summary": "摘要",
      "content": "<p>HTML 內容</p>",
      "coverImage": "https://img.paulfun.net/uploads/covers/AI.png",
      "categorySlug": "tech",
      "tagSlugs": ["go", "docker"],
      "publish": true,
      "publishedAt": "2026-03-01T00:00:00Z"
    }
  ],
  "update": false
}
```

| 欄位 | 說明 |
|------|------|
| `categorySlug` | 對應已存在的分類 slug |
| `tagSlugs` | 對應已存在的標籤 slug 陣列 |
| `publish` | `false` = 草稿, `true` = 發佈 |
| `publishedAt` | publish=true 時使用，省略則為當下時間 |
| `update` | 全域旗標：`true` = slug 重複時更新 content/summary；`false` = 跳過 |

---

### 6. AI 發文工作流程範例

```bash
# Step 1: 登入取得 token
TOKEN=$(curl -s -X POST https://paulfun.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"pin0513@gmail.com","password":"Test1234"}' \
  | jq -r '.data.token')

# Step 2: 查詢現有分類與標籤
curl -s https://paulfun.net/api/articles/categories | jq '.data[] | {id, name, slug}'
curl -s https://paulfun.net/api/articles/tags | jq '.data[] | {id, name, slug}'

# Step 3: 上傳封面圖（可選）
COVER_URL=$(curl -s -X POST https://paulfun.net/api/admin/media/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@cover.png" \
  | jq -r '.data.url')

# Step 4: 建立文章（草稿）
ARTICLE_ID=$(curl -s -X POST https://paulfun.net/api/admin/articles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"我的新文章\",
    \"summary\": \"這是摘要\",
    \"content\": \"<h2>標題</h2><p>內文 HTML</p>\",
    \"coverImage\": \"$COVER_URL\",
    \"categoryId\": 1,
    \"tagIds\": [1, 2]
  }" | jq -r '.data.id')

# Step 5a: 立即發佈
curl -X POST "https://paulfun.net/api/admin/articles/$ARTICLE_ID/publish" \
  -H "Authorization: Bearer $TOKEN"

# Step 5b: 或排程發佈
curl -X POST "https://paulfun.net/api/admin/articles/$ARTICLE_ID/publish" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"scheduledAt": "2026-03-10T09:00:00Z"}'

# 或使用批次匯入一次完成
curl -X POST https://paulfun.net/api/admin/import/articles \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "articles": [{
      "title": "批次匯入文章",
      "content": "<p>內容</p>",
      "categorySlug": "tech",
      "tagSlugs": ["go"],
      "publish": true
    }]
  }'
```

### 圖片 CDN

所有圖片透過 Cloudflare R2 CDN 提供：
- 靜態圖片: `https://img.paulfun.net/static/{filename}`
- 文章封面: `https://img.paulfun.net/uploads/covers/{filename}`
- 上傳媒體: `https://img.paulfun.net/uploads/{YYYY}/{MM}/{uuid}.{ext}`

## 快速驗證

```bash
# 1. 啟動 PostgreSQL
docker-compose -f docker-compose.dev.yml up -d

# 2. 啟動 Go server
cd backend-go && go run ./cmd/server/main.go

# 3. 測試登入
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"pin0513@gmail.com","password":"Test1234"}'

# 4. 測試文章列表
curl http://localhost:8080/api/articles
```

## E2E 測試（Playwright）

以使用者旅程（User Story）角度驗證前後端整合：

```bash
cd frontend

# 安裝 Playwright（首次）
npx playwright install --with-deps chromium

# 執行所有 E2E 測試（需先啟動前後端）
npm run test:e2e

# 互動模式（UI）
npm run test:e2e:ui

# 僅執行特定 Story
npx playwright test e2e/stories/visitor.spec.ts
npx playwright test e2e/stories/admin.spec.ts
```

### E2E 測試涵蓋的 User Stories

| Story | 檔案 | 說明 |
|-------|------|------|
| 訪客瀏覽 | `e2e/stories/visitor.spec.ts` | 首頁、文章列表、文章詳情、分類、標籤 |
| 管理員操作 | `e2e/stories/admin.spec.ts` | 登入、新增文章、發佈、媒體上傳、登出 |

## 資料庫備份（PostgreSQL）

```bash
# 備份
docker exec paulfun-postgres-dev pg_dump \
  -U postgres -F c paulfun_blogger \
  > ./docker/postgres/backup/dump_$(date +%Y%m%d).dump

# 還原
docker exec -i paulfun-postgres-dev pg_restore \
  -U postgres -d paulfun_blogger < ./docker/postgres/backup/dump.dump
```

## 設計風格

科技神秘風格 (Cyberpunk / Tech Noir)：
- 主色: 霓虹青 `#00D4FF`
- 次色: 神秘紫 `#7C3AED`
- 強調色: 霓虹粉 `#FF006E`
- 背景: 深邃黑 `#0A0A0F`
- 表面: 暗紫藍 `#1A1A2E`
- 文字: 銀白 `#E4E4E7`
- 字體: Inter / Noto Sans TC (標題與內文) / JetBrains Mono (程式碼)

特效：
- 霓虹光暈 (`shadow-glow`, `text-neon`)
- 漸層邊框 (`border-gradient`)
- 玻璃效果 (`glass`)
- 動態漸層背景 (`bg-animated-gradient`)

## GCP 部署環境

### VM 資訊

| 項目 | 值 |
|------|-----|
| 名稱 | `paul-ubuntu` |
| 區域 | `asia-east1-a` |
| 機型 | `g1-small` (1.7G RAM) |
| External IP | `35.206.236.34` |
| OS | Ubuntu 17.04 |
| 磁碟 | 20G |

### 部署架構

```
外部流量 → Cloudflare (HTTPS) → :80 → paulfun-nginx (reverse proxy)
                                        ├── / → paulfun-frontend (:3000, Next.js SSR)
                                        └── /api → paulfun-go-server (:8080, Go API)
                                                      └── paulfun-postgres (:5432)

舊 WordPress (備查) → :8089 → nginx-wp (skiychan/nginx-php7 + mariadb)
```

### 容器配置

| 容器 | Image | Port | 用途 |
|------|-------|------|------|
| `paulfun-nginx` | nginx:1.25-alpine | `80 → 80` | 反向代理 |
| `paulfun-frontend` | paulfun-frontend:prod | `3000`（內部） | Next.js 前端 |
| `paulfun-go-server` | paulfun-go-server:prod | `8080`（內部） | Go 後端 API |
| `paulfun-postgres` | postgres:16-alpine | `5432`（內部） | 資料庫 |
| `nginx-wp` | skiychan/nginx-php7 | `8089 → 80` | 舊 WordPress（備查） |
| `mariadb` | mariadb:10.2 | `3306`（內部） | WordPress DB |

### 存取方式

- Blog 網站: `https://paulfun.net`（經 Cloudflare proxy）
- Blog 直連: `http://35.206.236.34:80`（需帶 Host header）
- 舊 WordPress: `http://35.206.236.34:8089`
- SSH: `gcloud compute ssh paul-ubuntu --zone=asia-east1-a`

### 注意事項

- Cloudflare SSL mode 設為 Flexible（Cloudflare HTTPS → GCP HTTP:80）
- 舊 WordPress 保留在 port 8089 備查，容器名改為 `nginx-wp`
- VM 無 Swap，記憶體偏緊，需注意 OOM 風險
- OS 版本已停止支援 (Ubuntu 17.04)，未來考慮升級
