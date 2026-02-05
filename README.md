# PaulFun Blogger

個人部落格系統 - 科技神秘風 

## 快速開始

### 前置需求

- Docker Desktop
- Node.js 18+
- .NET 8 SDK

### 啟動開發環境

```bash
# 啟動資料庫
docker-compose up -d sqlserver

# 啟動後端 (Terminal 1)
cd backend/PaulFunBlogger.Api
dotnet run

# 啟動前端 (Terminal 2)
cd frontend
npm install
npm run dev
```

### 存取服務

| 服務 | 網址 |
|------|------|
| 前端 | http://localhost:3000 |
| API | http://localhost:5000 |
| API 文件 | http://localhost:5000/swagger |

## 專案架構

```
├── backend/                 # .NET 8 後端 API
│   └── PaulFunBlogger.Api/
├── frontend/                # Next.js 14 前端
├── docker/                  # Docker 設定
└── docker-compose.yml       # 本地開發環境
```

## 功能特色

- 文章管理 (CRUD、草稿、排程發佈)
- 分類與標籤系統
- Tiptap 富文本編輯器
- 圖片上傳與媒體管理
- 留言系統 (支援巢狀回覆)
- 點讚/踩功能
- JWT 認證
- RWD 響應式設計

## 技術選型

| 領域 | 技術 | 理由 |
|------|------|------|
| 前端框架 | Next.js 14 | App Router、SSR/SSG 支援 |
| 樣式 | TailwindCSS | 實用優先、高效開發 |
| 狀態管理 | Jotai | 輕量、SSR 友善 |
| 編輯器 | Tiptap | 高度可擴展、Vue/React 支援 |
| 後端 | .NET 8 Minimal API | 高效能、簡潔 |
| ORM | EF Core 8 | Code First、強型別 |
| 認證 | JWT | 無狀態、SPA 友善 |

## License

MIT
