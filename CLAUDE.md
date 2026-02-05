# PaulFun Blogger

個人部落格系統，前後端分離架構。

## 專案結構

```
/paulfun-blogger/
├── .github/workflows/     # CI/CD Pipeline
├── backend/               # .NET 8 後端
│   └── PaulFunBlogger.Api/
├── frontend/              # Next.js 14 前端
├── docker/                # Docker 相關設定
├── docker-compose.yml     # 本地開發環境
└── README.md
```

## 技術棧

| 層級 | 技術 |
|------|------|
| 前端 | Next.js 14 (App Router) + TailwindCSS + Jotai + Tiptap |
| 後端 | .NET 8 Minimal API + EF Core 8 |
| 資料庫 | SQL Server 2022 (開發) / PostgreSQL (生產) |
| 部署 | GCP Cloud Run + Cloud Storage |

## 開發指令

### 後端

```bash
cd backend/PaulFunBlogger.Api
dotnet run
```

### 前端

```bash
cd frontend
npm run dev
```

### Docker 環境

```bash
docker-compose up -d
```

## API 端點

- 健康檢查: `GET /health`
- 前台 API: `/api/articles`, `/api/categories`, `/api/tags`
- 認證 API: `/api/auth/*`
- 後台 API: `/api/admin/*` (需認證)

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
