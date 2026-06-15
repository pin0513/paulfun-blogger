# Personal RAG over paulfun blog + LearningWiki

**日期**: 2026-05-27
**狀態**: Plan（待 user 最終確認進入 implementation）
**範圍**: Phase 1 — Personal RAG MVP（單一使用者：Paul）

---

## Context

Paul 多年累積的內容散落兩處：
- `paulfun.net` blog — **188 篇文章**（~280K 字），存於 PostgreSQL `articles.content` (TEXT)
- `LearningWiki` repo (`github.com/pin0513/LearningWiki`) — **259 個 markdown**（~101K 字），km-skill 約定結構

**痛點**：
- 想問「我過去寫過什麼跟 X 有關」要靠記憶 + grep
- 寫新文時無法用過去素材輔助
- 既有 blog 搜尋是 SQL `LIKE` (O(n) full scan)，沒語義匹配

**目標**：建一個 RAG 層 + 簡單 UI，先給 Paul 自己用驗證價值。Phase 2（不在本 plan）若驗證有用再擴 community。

---

## 設計選擇（已決）

| 決策 | 選擇 | 理由 |
|------|------|------|
| 使用者 | 先個人；Phase 2 再社群 | YAGNI；先驗證 |
| 內容範圍 | paulfun blog + LearningWiki | 不考慮未來 moments（YAGNI） |
| Privacy | 全雲 OK（OpenAI / Anthropic / Voyage） | 個人接受 |
| 架構 | Option A：嵌入 paulfun-blogger | reuse 既有 PG/Go/Next.js infra |
| Vector store | **pgvector**（PG extension） | 既有 PG；少一個容器 |
| Embedding model | **OpenAI `text-embedding-3-small`**（1536 dim） | $0.02/M、品質好、生態好 |
| LLM | **Claude Sonnet 4.6** via Anthropic API | 已付費、長 context、繁中強 |
| Chunking | 段落級 + 語義邊界（H2/H3）；fallback 1500 char window | 一般 RAG best practice |
| 索引模式 | Cron 每日 pull + reindex（incremental by hash） | 個人用，realtime overkill |
| 介面 | 既有 admin 加 `/admin/ask` 頁；streaming + citations | reuse 既有 auth/UI |
| 部署 | 沿用 paulfun GCP VM | 不開新主機 |

---

## 架構（Option A 細節）

```
┌──────────────────────────────────────────────────────────────────┐
│  Sources                                                          │
│  ┌─────────────────────────┐    ┌──────────────────────────────┐ │
│  │ blog articles (PG)      │    │ LearningWiki repo            │ │
│  │ articles.content (TEXT) │    │ (git clone /var/learningwiki)│ │
│  │ 188 篇                  │    │ 259 .md                      │ │
│  └────────────┬────────────┘    └────────────┬─────────────────┘ │
│               │                              │                    │
│               └──────────┬───────────────────┘                    │
└──────────────────────────┼────────────────────────────────────────┘
                           ↓
       ┌────────────────────────────────────────────────┐
       │ Indexer (Go CLI: cmd/sat-indexer/main.go)      │
       │  1. enumerate sources                          │
       │  2. compute content hash                       │
       │  3. skip if hash 未變                          │
       │  4. chunk (H2/H3 boundary + 1500 char window)  │
       │  5. embed via OpenAI text-embedding-3-small    │
       │  6. upsert to documents table                  │
       │ 觸發：cron 每日 03:00；可手動 ./sat-indexer    │
       └────────────────────┬───────────────────────────┘
                            ↓
       ┌────────────────────────────────────────────────┐
       │ PostgreSQL (paulfun-postgres) + pgvector       │
       │ documents (                                    │
       │   id, source, source_id, source_path,          │
       │   chunk_idx, content, content_hash,            │
       │   embedding vector(1536),                       │
       │   metadata jsonb (title, category, url, ...)   │
       │ )                                              │
       │ + GIN index on metadata; ivfflat on embedding  │
       └────────────────────┬───────────────────────────┘
                            ↓
       ┌────────────────────────────────────────────────┐
       │ Query handler (Go: handlers/ask_handler.go)    │
       │ POST /api/admin/ask                            │
       │  body: { query: "...", topK?: 8 }              │
       │  1. embed(query)                               │
       │  2. SELECT ... ORDER BY embedding <-> q LIMIT k│
       │  3. assemble prompt with retrieved chunks      │
       │  4. Claude API streaming                       │
       │  5. SSE stream → client                        │
       └────────────────────┬───────────────────────────┘
                            ↓
       ┌────────────────────────────────────────────────┐
       │ Frontend: /admin/ask page                      │
       │  • 輸入框 + 送出                                │
       │  • 串流顯示答案                                 │
       │  • 下方 citations 列表（標題、連結、相關度）   │
       │  • 歷史對話可選保留（local storage）            │
       └────────────────────────────────────────────────┘
```

---

## 關鍵檔案（新增 / 修改）

### Backend（Go）

```
backend-go/
├── cmd/
│   ├── server/main.go                  # MODIFY: wire RAGService + AskHandler
│   └── sat-indexer/main.go             # NEW: CLI indexer entry
├── internal/
│   ├── models/
│   │   └── document.go                 # NEW: pgvector model
│   ├── services/
│   │   ├── embedding_service.go        # NEW: OpenAI embedding client
│   │   ├── chunking_service.go         # NEW: text → chunks
│   │   ├── indexer_service.go          # NEW: sources → chunks → embed → DB
│   │   ├── retrieval_service.go        # NEW: query → top-K chunks
│   │   ├── rag_service.go              # NEW: retrieval + Claude API
│   │   └── llm_client.go               # NEW: Anthropic client wrapper
│   ├── sources/
│   │   ├── blog_source.go              # NEW: 從 PG articles 抓
│   │   └── wiki_source.go              # NEW: 從 LearningWiki 掃 .md
│   ├── handlers/
│   │   └── ask_handler.go              # NEW: POST /api/admin/ask (SSE stream)
│   ├── dto/
│   │   └── ask_dto.go                  # NEW
│   ├── db/
│   │   ├── db.go                       # MODIFY: AutoMigrate Document; init pgvector ext
│   │   └── migrations/
│   │       └── 003_pgvector.up.sql     # NEW: CREATE EXTENSION vector; CREATE INDEX
│   ├── config/
│   │   └── config.go                   # MODIFY: OPENAI_API_KEY, ANTHROPIC_API_KEY, WIKI_REPO_PATH
│   └── router/
│       └── router.go                   # MODIFY: 加 /api/admin/ask
└── go.mod                              # ADD: github.com/pgvector/pgvector-go, openai sdk, anthropic sdk
```

### Frontend（Next.js）

```
frontend/src/
├── app/(admin)/
│   ├── layout.tsx                      # MODIFY: nav 加「💬 Ask」
│   └── admin/ask/
│       └── page.tsx                    # NEW: chat UI（input + streaming + citations）
└── lib/api/
    └── ask.ts                          # NEW: SSE client
```

### Infra

```
docker-compose.prod.yml                 # MODIFY: postgres image 換 pgvector/pgvector:pg16
                                        # MODIFY: 加 LearningWiki bind mount
docker/postgres/init.sql                # NEW: CREATE EXTENSION IF NOT EXISTS vector;
crontab (VM)                            # NEW: 03:00 daily run sat-indexer
```

---

## Schema (PostgreSQL + pgvector)

```sql
-- 003_pgvector.up.sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE documents (
  id           SERIAL PRIMARY KEY,
  source       VARCHAR(20) NOT NULL,         -- 'blog' | 'wiki'
  source_id    VARCHAR(200) NOT NULL,         -- article id | wiki file path
  source_path  TEXT NOT NULL,                 -- canonical pointer for citation
  chunk_idx    INT NOT NULL,
  content      TEXT NOT NULL,
  content_hash CHAR(64) NOT NULL,             -- SHA-256, for incremental update
  embedding    vector(1536) NOT NULL,
  metadata     JSONB NOT NULL DEFAULT '{}',   -- {title, category, url, lang, ...}
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ
);

CREATE INDEX idx_doc_source_id ON documents(source, source_id);
CREATE INDEX idx_doc_metadata ON documents USING gin(metadata);
-- ivfflat 適合 < 1M rows；lists ~ sqrt(N)，目前 N~2000 → lists=50
CREATE INDEX idx_doc_embedding ON documents USING ivfflat (embedding vector_l2_ops) WITH (lists = 50);
```

---

## 實作順序

| Step | 任務 | 估時 | 可單獨 verify |
|------|------|------|------|
| 1 | docker-compose postgres image 換 pgvector/pgvector:pg16；init.sql `CREATE EXTENSION` | 30m | `\dx vector` 看得到 |
| 2 | models.Document + AutoMigrate；003 migration | 30m | `\d documents` 看得到 |
| 3 | go.mod 加 pgvector-go、openai-go、anthropic-sdk-go | 15m | `go build` |
| 4 | config 加 OPENAI_API_KEY / ANTHROPIC_API_KEY / WIKI_REPO_PATH | 15m | env 讀得到 |
| 5 | embedding_service.go：包 OpenAI embedding API + retry | 1h | unit test mock |
| 6 | chunking_service.go：H2/H3 邊界 + 1500 char window fallback | 1h | unit test |
| 7 | sources/blog_source.go：從 PG articles 抓 published | 30m | CLI list output |
| 8 | sources/wiki_source.go：掃 `/var/learningwiki/**/*.md` | 30m | CLI list output |
| 9 | indexer_service.go：source → chunk → hash → embed → upsert | 1.5h | CLI 跑一次，DB 看 row count |
| 10 | cmd/sat-indexer/main.go：CLI entry | 30m | `./sat-indexer --source blog` 跑 |
| 11 | **首次全量 ingest**：local 跑 indexer 跑 paulfun 全部資料 | 30m | `SELECT count(*) FROM documents` ≈ 2000 |
| 12 | retrieval_service.go：query → embed → ANN search | 1h | unit test |
| 13 | llm_client.go：Anthropic Claude messages + streaming | 1h | curl 測 streaming |
| 14 | rag_service.go：assemble prompt + retrieval + LLM | 1h | end-to-end |
| 15 | handlers/ask_handler.go + dto + router：SSE endpoint | 1h | curl SSE 收得到 |
| 16 | frontend lib/api/ask.ts：SSE client + EventSource | 1h | console test |
| 17 | frontend admin/ask/page.tsx：input + 串流 + citations | 2h | browser 可用 |
| 18 | layout.tsx 加 nav「💬 Ask」 | 5m | UI 看到 |
| 19 | 部署：build go + frontend image → scp → restart | 30m | production 跑得起 |
| 20 | VM crontab：`0 3 * * * cd /opt/paulfun && ./sat-indexer` + `git -C /var/learningwiki pull` | 15m | cron 跑一次 |
| 21 | CLAUDE.md 補 RAG 章節 + .env 範例補 keys | 30m | docs commit |

**Total ~15h**，可拆 3 個 PR：
- **PR 1 (Step 1-11)**：Schema + indexer + 首次 ingest。後端可獨立部署，curl 測 indexer
- **PR 2 (Step 12-15)**：Retrieval + LLM + SSE endpoint。curl 可以打到 ask
- **PR 3 (Step 16-21)**：Frontend UI + cron + docs

---

## 驗證計畫

### Unit / Integration
- chunking 對 fixture md 切分結果與預期一致
- embedding service mock 後 cosine similarity 對得上
- retrieval 用已知 query 拿到對應已知 doc（top-1 命中）
- rag end-to-end fixture：問固定問題拿到含特定 citation 的答案

### Manual smoke test
- 部署後問 5 個你「應該記得自己寫過」的問題：
  - 「我寫過 SAT 的設計嗎？」→ 應引到 spec v3
  - 「圍棋我有什麼筆記？」→ 應引到 wiki/圍棋/
  - 「我對 cheap claw 的觀點」→ 應引到 raw/articles/20260311
  - 「我的 AI thought 系列重點」→ 應引到 20260125-ai-thought
  - 「Hermes agent skill accumulation」→ 應引到 20260419
- 每個答案檢查：相關度高、citation 連結點得到、沒幻覺新資料

### Cost monitoring
- 首次 ingest 完看 OpenAI usage：應 < $0.05
- Claude API：每次 query 看 token 用量，估算每月 ~$X（依使用頻率）

---

## 已知 risk / 不在 MVP

| Risk | 緩解 / 推遲 |
|------|------|
| OpenAI / Anthropic API key 洩漏 | env var only，不進 repo；放 1Password；rate limit |
| pgvector container 換掉影響既有 paulfun postgres data | `pgvector/pgvector:pg16` 完全相容 postgres:16；先 backup dump 再切 |
| ivfflat 在 < 1k rows 效果差 | rows 過 2k 才有意義；可先 fallback 不建 index，scan 全表也夠快（µs 級） |
| Wiki 私密內容（如果有）洩漏到 LLM 對話 | 個人用 OK；Phase 2 community 時加 visibility filter |
| cron 失敗沒人察覺 | indexer 寫 log；可選 sendmail / webhook 通知（YAGNI） |
| 答案幻覺 | prompt 強制「只用提供的 context；找不到就說找不到」；citations 強制顯示 source |

**不在本 MVP**：
- Hybrid retrieval（BM25 + vector）— 純 vector 對個人用夠
- Query rewriting / HyDE — 同上
- Reranking model — 同上
- 多輪對話 history — first version 單輪 Q&A
- 對話記憶 / persona tuning — Phase 2
- Public-facing endpoint — Phase 2
- 細部 source filter UI（只搜 wiki / 只搜 blog） — Phase 1.5 可加

---

## 開放問題（implementation 前要決定）

1. **WIKI_REPO_PATH 在 VM 上的位置** — `/var/learningwiki/` 還是 `~/paulfun-blogger/_external/learningwiki/`？前者更乾淨，但 git pull 要對。
2. **OpenAI API key 從哪來** — Paul 已有 OpenAI 帳號？或要先開？
3. **Anthropic API key** — 同上。
4. **Cron job 失敗通知** — 接受 silent fail 嗎？還是要 email？

這幾個下 implementation 前再 quick confirm 一下即可，不擋本 plan 通過。

---

## 變更記錄

- **2026-05-27 v1**: 初稿（Claude + Paul brainstorming）
