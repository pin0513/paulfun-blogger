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
├── docker-compose.yml     # 完整環境
└── README.md
```

## 技術棧

| 層級 | 技術 |
|------|------|
| 前端 | Next.js 14 (App Router) + TailwindCSS + Jotai + Tiptap |
| 後端 | Go 1.22 + Gin + GORM |
| 資料庫 | PostgreSQL 16 Alpine |
| 部署 | GCP Cloud Run + Cloud Storage |

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

## API 端點

- 健康檢查: `GET /health`
- 前台 API: `/api/articles`, `/api/categories`, `/api/tags`
- 認證 API: `/api/auth/login`, `/api/auth/register`, `/api/auth/me`
- 後台 API: `/api/admin/*`（需 Bearer token）

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
