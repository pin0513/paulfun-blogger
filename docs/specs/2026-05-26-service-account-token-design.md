# Service Account Token (SAT) — Design & Implementation

**日期**: 2026-05-26
**版本**: v3（MVP 重新規劃範圍：strictly additive，不動既有 code 任何 contract）
**狀態**: Draft（待最終確認後進入 implementation plan）
**目標**: 讓 AI agent / CI / 外部 script 不用人類密碼登入 API

---

## v3 設計哲學：strictly additive

v1 試圖完美、v2 引入 backward-compat 災難，v3 退一步問：**MVP 真的需要 strict revocation 嗎？**

答案是 **不需要**。一個個人 blog 接受「停用 SAT 後該張 JWT 最多再活 1 小時」是完全合理的取捨。

換來的好處：

- ✅ 既有 `middleware.AuthRequired(jwtSecret)` 簽名 0 動
- ✅ 既有 `Claims` struct 0 動（Sub 保留 string，role 保留在 claims）
- ✅ 既有 context keys (`userID`, `userRole`) 0 動
- ✅ 既有 `AuthHandler.Me`、`AdminHandler.*` 0 動
- ✅ 既有 `AuthService.Login` / `Register` 邏輯 0 動
- ✅ 既有 `router.Setup` 簽名 0 動（只加新 route）
- ✅ 瀏覽器裡所有現存 JWT 仍 valid

**新功能完全是 additive — 加新 endpoint、新 service、新 model、新 admin handler、新前端頁。不動現有任何 contract。**

文件分兩段：

- **Part 1: SAT Pattern（可移植）** — 抽象需求 + relational+JWT reference 實作
- **Part 2: paulfun-blogger 實作** — Go 落地，strictly additive

---

# Part 1 — SAT Pattern（可移植）

## 1.1 動機

非人類呼叫 API 的場景：

| 情境 | 為什麼不適合人類密碼 |
|------|------|
| AI agent 自動發文 / 改設定 | password 進 prompt 會洩漏到 conversation log |
| CI/CD 自動部署 | password 進 CI secrets 仍是長壽憑證 |
| 第三方 webhook 回呼 | 換密碼會打斷 integration |
| Cron 定時任務 | 同上 |

## 1.2 核心觀念

```
SAT (long-lived, opaque)  ─── exchange ──→  Session Token (short-lived)
```

- **SAT** 是長生命週期的不透明 secret，admin 預先建立。**只在「換 token」那一刻送上 server**。
- **Session Token** 短壽。失效機制是 **自然過期**，不依賴中央 revocation list。
- 兩階段設計的價值：SAT 平時不暴露，API 呼叫只送短壽 session token。

## 1.3 邏輯需求（不綁 stack）

設計這個 pattern 必須滿足以下需求；具體技術選擇是後話：

| # | 需求 | 為什麼 |
|---|------|------|
| R1 | SAT 必須**不可逆儲存**，明文僅在建立時暴露一次 | DB 洩漏 ≠ token 洩漏 |
| R2 | SAT 必須有**可吊銷的 active 狀態**，不依賴刪除 | 暫停 + 審計留痕 |
| R3 | SAT 可選有限期（含「永不過期」選項） | 短期 token + 長期 CI 兼容 |
| R4 | SAT 必須**綁定 principal**；principal 失效時 SAT exchange 失敗 | 離職員工的 SAT 自動失效 |
| R5 | Session token 必須**短壽**（≤ 1 小時建議） | 限制 SAT 撤銷生效的最大延遲 |
| R6 | 失敗訊息**對外通用、對內具體** | 防 enumerate token 狀態 |
| R7 | SAT 不可用來管理 SAT 本身（防 lateral movement） | 限制外洩後爆炸半徑 |
| R8 | 完整 audit：建立 / 修改 / 撤銷 / exchange 都有結構化紀錄 | 事故回溯 |

**v3 刻意省略的需求**（v1/v2 的）：

| 已捨棄 | 為什麼省 |
|------|------|
| ~~R: session token 必須即時失效~~ | 換成 R5「session token 短壽」，用過期換取簡化 |
| ~~R: 權限永遠當下重讀~~ | 接受 1h JWT 內權限被「凍結」。Demote 後最多 1h 仍生效，對個人/小團隊 OK |
| ~~R: middleware cross-check~~ | server 簽 JWT 時就 cross-check 過了，per-request 重檢屬於防御性過度 |

如果你之後規模長大、有 immediate revocation 強需求，**v1/v2 的 strict revocation 設計仍可重新引入**（middleware 加 SAT liveness check），但這是後話。

## 1.4 五個邏輯角色

| 角色 | 職責 | 例：常見實作 |
|------|------|------|
| **SAT 紀錄** | 持久化儲存，含「不可逆 token 指紋」+ metadata | RDBMS row、KV store entry |
| **Exchange Endpoint** | 收 SAT，驗證後簽短壽 session token | HTTP `POST /auth/ai-login` |
| **Linked Principal** | SAT 對應的身分，決定 token 權限 | 既有的 user/account 紀錄 |
| **Existing Auth Middleware** | **不動** — 只驗 session token 簽章 + 過期 | 既有 HTTP middleware / API Gateway plugin |
| **Admin CRUD** | 管 SAT | Web UI / CLI |

**注意**：v3 沒有「SAT 專用 middleware」。Session token 進入既有 middleware 跟其他 session token 一視同仁，靠短壽期維持安全性。

## 1.5 Reference 實作（relational + JWT）

最常見的 stack：RDBMS + JWT。對應每條需求：

| 需求 | Relational + JWT 實作 |
|------|------|
| R1 | `token_hash = SHA-256(plaintext)` 存 DB。建立 response 含明文，之後不暴露 |
| R2 | DB column `is_active BOOLEAN` |
| R3 | `expires_at TIMESTAMP NULLABLE`（NULL = 永久） |
| R4 | DB FK `user_id → users(id) ON DELETE CASCADE`；exchange 時讀 `user.is_active` |
| R5 | exchange 簽 JWT 時 `exp = now + 1h`（既有 user JWT 是 24h，AI-issued 短壽） |
| R6 | exchange 失敗一律回 401 + generic message；server log 寫具體原因 |
| R7 | SAT 管理 endpoint 在 handler 入口檢查 `if claims.sat_id != 0 { return 403 }` |
| R8 | 結構化 log（`event`, `sat_id`, `actor_user_id`, ...） |

### 1.5.1 Auth Flow

```
─── 階段 A: 換 session token ────────────────────────────

[Client]                  [API Server]                  [DB]
   │                          │                          │
   │ POST /auth/ai-login      │                          │
   │ { token: "sat_xxx" }     │                          │
   │─────────────────────────▶│                          │
   │                          │ validate format          │
   │                          │   (prefix + length)      │
   │                          │ hash = SHA256(token)     │
   │                          │ SELECT sat WHERE         │
   │                          │   token_hash = hash      │
   │                          │─────────────────────────▶│
   │                          │◀─────────────────────────│
   │                          │ assert active            │
   │                          │ assert !expired          │
   │                          │ assert user.is_active    │
   │                          │ UPDATE last_used_at      │
   │                          │   (just this once)       │
   │                          │─────────────────────────▶│
   │                          │ sign JWT {               │
   │                          │   sub: user.id,          │
   │                          │   role: user.role,       │
   │                          │   sat_id: sat.id,        │
   │                          │   exp: now + 1h ◀── 短壽 │
   │                          │ }                        │
   │◀─────────────────────────│                          │
   │ { token, expiresAt }     │                          │
   │ (失敗一律回 401)         │                          │

─── 階段 B: 用 session token 呼叫 API ───────────────────

[Client]                  [API Server]
   │ GET /api/whatever        │
   │ Authorization: Bearer    │
   │─────────────────────────▶│
   │                          │ 既有 AuthRequired middleware
   │                          │ 純 JWT 驗證（簽章 + exp）
   │                          │ 不查 DB
   │                          │ proceed to handler
   │◀─────────────────────────│

注意：階段 B 跟 user-login JWT 完全一樣。中介層完全不知道也不關心
這張 JWT 是 SAT 換來的還是 user 密碼換來的。
```

### 1.5.2 Data Model

```
service_account_tokens
─────────────────────────────────────────────────────────────────
  id            ID                       primary key
  user_id       FK → users(id) CASCADE   linked principal
  name          string                   admin-facing label
  token_hash    string, UNIQUE INDEX     SHA-256(plaintext) hex
  token_prefix  string                   plaintext[:12] for UI/log
  is_active     boolean                  soft revoke (R2)
  expires_at    timestamp NULLABLE       NULL = no expiry (R3)
  last_used_at  timestamp NULLABLE       updated at exchange time only
  created_at    timestamp
  updated_at    timestamp NULLABLE
```

- `token_hash`: SHA-256 — random tokens 256 bits entropy，brute force infeasible；不用 bcrypt
- `token_prefix`: `plaintext[:12]` = `sat_` (4) + 8 字 base64 = 12 字總長。例：`sat_OHBZeTK4`
- `last_used_at`: 只在 exchange 時更新，**不**在每次 API 呼叫更新（v2 那邊的 race / 寫放大都不存在）

### 1.5.3 API 契約

```
公開（不需 auth）
─────────────────────────────────────────────────────────────────
POST /auth/ai-login
  request:  { "token": "sat_xxx..." }
  validation:
    - body 非空
    - token 有 sat_ prefix
    - len(token) == 預期值
  response 200: { "token": "eyJ...", "expiresAt": "<now + 1h>" }
  response 422: { "success": false, "message": "invalid credentials" }
    ↑ 跟 /api/auth/login 一致回 422（既有慣例）
  response 429: rate limit

Admin（需 admin session token；SAT-issued JWT 被 handler 入口擋下）
─────────────────────────────────────────────────────────────────
GET    /admin/service-account-tokens
POST   /admin/service-account-tokens    回 plaintext token（唯一一次）
PATCH  /admin/service-account-tokens/:id    改 name / expires_at / is_active
DELETE /admin/service-account-tokens/:id    soft delete = is_active=false
```

**為什麼 SAT 不能管 SAT（R7）**：避免一張外洩 token 自己延期、改名、再生新 token。實作：在 4 個 admin handler 入口檢查 `if claims.SatID != 0 { return 403 }`，不用獨立 middleware。

## 1.6 Token 格式 & 顯示

- **格式**: `sat_` + 32 bytes base64url = 47 字總長
  - 範例：`sat_OHBZeTK4DaP8EdE4jn6y2czDavdN-9k3xv4QkX0p_aa`
- **儲存**: 只存 `SHA-256(token)` 的 hex（64 字）
- **顯示**: 建立時 response 回明文**唯一一次**；之後只看得到 `token_prefix`
- **前綴用途**: UI 識別、log 識別、leak detection regex

## 1.7 安全注意事項

1. HTTPS only
2. `/auth/ai-login` 重用既有 `loginLimiter`（同 `/auth/login` 那條），減少新 middleware
3. Audit log 結構化記錄 SAT 的 lifecycle 事件
4. 完整 token 永遠不能 log；只能 log `token_prefix`
5. Token 不可走 query string
6. SAT-issued JWT 在 SAT 管理 handler 內被拒（R7）

## 1.8 已知不在 MVP 的擴充（YAGNI）

| 功能 | 何時值得加 |
|------|------|
| **Strict revocation**（middleware 每 request 查 DB）| 需要 < 1h 撤銷延遲時。本 MVP 接受 1h 延遲 |
| **Per-request role re-read** | 同上，需要 demote 立即生效時 |
| **Scopes**（per-token 限制 endpoint） | 同帳號多用途、需要最小權限 |
| **IP allowlist** | 已知固定來源 |
| **Auto-rotate**（grace period 換新 token） | 合規要求或大型團隊 |
| **In-memory SAT cache** | 配合 strict revocation 時減少 DB 壓力 |
| **Usage analytics** | 容量規劃需求 |
| **獨立 audit_log 表** | 紀錄保留超過 log 系統 retention |

---

# Part 2 — paulfun-blogger 實作

把 Part 1 落地到本 repo。**strictly additive：不改既有任何 type / function / signature / context key**。

## 2.1 Stack 對應

| Part 1 角色 | paulfun 實作 |
|------|------|
| User / Principal | `users` table，`models.User` |
| Session token | JWT HS256；**user-login 24h（既有，不變）、SAT-issued 1h（新）** |
| Exchange endpoint | `POST /api/auth/ai-login`（新增） |
| Existing Auth Middleware | `middleware.AuthRequired(jwtSecret)` **不變** |
| Admin CRUD | `POST/GET/PATCH/DELETE /api/admin/service-account-tokens`（新增） |
| Database | PostgreSQL 16, `paulfun-postgres` |
| Frontend | Next.js 14，新頁 `/admin/tokens` |

## 2.2 對既有 code 的影響清單

| 既有檔案 | v3 改動 |
|------|------|
| `middleware/auth.go` | **完全不動** |
| `middleware/ratelimit.go` | **完全不動**（重用既有 `loginLimiter` 給 ai-login） |
| `services/auth_service.go` | 加一個 method `AILogin(token string)`，**不動既有 Login/Register** |
| `handlers/auth_handler.go` | 加一個 method `AILogin(c *gin.Context)`，**不動既有** |
| `router/router.go` | 加 `auth.POST("/ai-login", ...)` + admin group 加 SAT 4 routes，**簽名不變** |
| `dto/` | 加 `AILoginRequest`、`SATCreateRequest` 等新 type，**不動既有** |
| `models/` | 加 `ServiceAccountToken`，**不動既有 User** |

`Claims` struct **加 optional 欄位** `SatID uint *json:"sat_id,omitempty"*` —— 既有 JWT 沒這個欄位，解碼仍 OK；新發 JWT 在 SAT path 才會寫。這是唯一一個碰到既有 type 的地方，但只是新增 optional field，向後相容。

## 2.3 新檔案佈局

```
backend-go/internal/
├── models/
│   └── service_account_token.go         # NEW
├── dto/
│   └── sat_dto.go                        # NEW
├── services/
│   ├── sat_service.go                    # NEW: Generate / Exchange / CRUD
│   └── auth_service.go                   # ADD method AILogin
├── handlers/
│   ├── auth_handler.go                   # ADD method AILogin
│   └── sat_admin_handler.go              # NEW: admin CRUD（內部檢 RejectSAT）
└── router/
    └── router.go                         # ADD: ai-login route + sat admin group

frontend/src/
├── app/(admin)/admin/
│   └── tokens/
│       └── page.tsx                      # NEW: SAT 管理頁
└── lib/api/
    └── sat.ts                            # NEW: API client
```

## 2.4 DB Schema

```sql
-- 002_sat.up.sql (或 GORM AutoMigrate)
CREATE TABLE service_account_tokens (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  token_hash    CHAR(64) NOT NULL,
  token_prefix  VARCHAR(12) NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at    TIMESTAMPTZ,
  last_used_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ
);
CREATE UNIQUE INDEX idx_sat_token_hash ON service_account_tokens(token_hash);
CREATE INDEX idx_sat_user_id ON service_account_tokens(user_id);
```

GORM AutoMigrate 也 OK。本專案 `db.Init` 走 AutoMigrate。

## 2.5 GORM Model

```go
// internal/models/service_account_token.go
package models

import "time"

type ServiceAccountToken struct {
    ID           uint       `gorm:"primaryKey;autoIncrement" json:"id"`
    UserID       uint       `gorm:"not null;index" json:"userId"`
    User         *User      `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
    Name         string     `gorm:"not null;size:100" json:"name"`
    TokenHash    string     `gorm:"not null;size:64;uniqueIndex" json:"-"`
    TokenPrefix  string     `gorm:"not null;size:12" json:"tokenPrefix"`
    IsActive     bool       `gorm:"not null;default:true" json:"isActive"`
    ExpiresAt    *time.Time `json:"expiresAt"`
    LastUsedAt   *time.Time `json:"lastUsedAt"`
    CreatedAt    time.Time  `json:"createdAt"`
    UpdatedAt    *time.Time `json:"updatedAt"`
}
```

`User *User`（pointer）— 避免 Preload 失敗時 zero-value 騙過 IsActive check（codex V2-P1 #5）。讀取時做 nil check。

## 2.6 Claims 加 optional SatID

```go
// internal/middleware/auth.go (唯一一處對既有 type 的改動)
type Claims struct {
    Sub   string `json:"sub"`         // 既有，不變
    Email string `json:"email"`       // 既有，不變
    Role  string `json:"role"`        // 既有，不變
    SatID uint   `json:"sat_id,omitempty"` // NEW，optional；既有 JWT 沒這個欄位也能 decode
    jwt.RegisteredClaims
}
```

**為什麼這是安全改動**：
- 既有 JWT JSON 沒 `sat_id` 欄位 → unmarshal 進 `uint` 預設 0，OK
- 新 JWT 簽 SAT path 時寫入；user path 不寫
- `omitempty` 確保 user path 簽出的 JWT JSON 不含 `sat_id`
- 既有 middleware 不讀也不檢查 `SatID`，不會受影響

## 2.7 Service Layer

```go
// internal/services/sat_service.go (新檔)
package services

import (
    "crypto/rand"
    "crypto/sha256"
    "encoding/base64"
    "encoding/hex"
    "strings"
    "time"

    "github.com/paulhuang/paulfun-blogger/internal/apierror"
    "github.com/paulhuang/paulfun-blogger/internal/models"
    "gorm.io/gorm"
)

const (
    SATPrefix       = "sat_"
    SATRawBytes     = 32
    SATFullLength   = 47   // "sat_" (4) + base64url(32 bytes) = 43
    SATPrefixLength = 12
)

type SATService struct {
    db *gorm.DB
}

func NewSATService(db *gorm.DB) *SATService {
    return &SATService{db: db}
}

func (s *SATService) Generate(userID uint, name string, expiresAt *time.Time) (string, *models.ServiceAccountToken, error) {
    raw := make([]byte, SATRawBytes)
    if _, err := rand.Read(raw); err != nil {
        return "", nil, err
    }
    plaintext := SATPrefix + base64.RawURLEncoding.EncodeToString(raw)
    sum := sha256.Sum256([]byte(plaintext))
    hashHex := hex.EncodeToString(sum[:])

    sat := &models.ServiceAccountToken{
        UserID:      userID,
        Name:        name,
        TokenHash:   hashHex,
        TokenPrefix: plaintext[:SATPrefixLength],
        IsActive:    true,
        ExpiresAt:   expiresAt,
    }
    if err := s.db.Create(sat).Error; err != nil {
        return "", nil, err
    }
    return plaintext, sat, nil
}

// ExchangeForUser 驗證 SAT 並回傳 (sat, user)。失敗統一回 apierror.ErrUnauthorized。
func (s *SATService) ExchangeForUser(plaintext string) (*models.ServiceAccountToken, *models.User, error) {
    // R6: 格式 pre-check，省 DB 查
    if !strings.HasPrefix(plaintext, SATPrefix) || len(plaintext) != SATFullLength {
        return nil, nil, apierror.ErrUnauthorized
    }
    sum := sha256.Sum256([]byte(plaintext))
    hashHex := hex.EncodeToString(sum[:])

    var sat models.ServiceAccountToken
    if err := s.db.Preload("User").Where("token_hash = ?", hashHex).First(&sat).Error; err != nil {
        // log.Info("sat exchange failed: not found", "prefix", plaintext[:8])
        return nil, nil, apierror.ErrUnauthorized
    }
    if !sat.IsActive {
        return nil, nil, apierror.ErrUnauthorized
    }
    if sat.ExpiresAt != nil && time.Now().After(*sat.ExpiresAt) {
        return nil, nil, apierror.ErrUnauthorized
    }
    // pointer + nil check（V2-P1 #5 防御）
    if sat.User == nil || !sat.User.IsActive {
        return nil, nil, apierror.ErrUnauthorized
    }

    // last_used_at: 用條件 UPDATE 避 race（V2-P2 改進，雖然這裡其實只在 exchange 跑一次）
    now := time.Now()
    s.db.Model(&sat).Update("last_used_at", &now) // best-effort

    return &sat, sat.User, nil
}

// CRUD: List, Create (Generate 包裝), Update, SoftDelete — 略，標準 GORM CRUD
```

## 2.8 Auth Service 加 AILogin

```go
// internal/services/auth_service.go (加 method，不動既有)

// 既有 struct：
// type AuthService struct {
//     db *gorm.DB
//     cfg *config.Config
// }

// 加一個 method（在現有 AuthService 上，需要 SATService 參考）：
func (s *AuthService) AILoginExchange(plaintext string, satSvc *SATService) (dto.AuthResponse, error) {
    sat, user, err := satSvc.ExchangeForUser(plaintext)
    if err != nil {
        return dto.AuthResponse{}, err
    }

    // 簽 JWT — 1h 短壽，加 sat_id claim，**role 仍 baked**（跟既有 user JWT 一致）
    exp := time.Now().Add(1 * time.Hour)
    claims := middleware.Claims{
        Sub:   fmt.Sprintf("%d", user.ID), // 跟既有 user JWT 一致用 string
        Email: user.Email,
        Role:  user.Role,
        SatID: sat.ID,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(exp),
            IssuedAt:  jwt.NewNumericDate(time.Now()),
        },
    }
    token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).
        SignedString([]byte(s.cfg.JWTSecret))
    if err != nil {
        return dto.AuthResponse{}, err
    }

    return dto.AuthResponse{
        Token:     token,
        ExpiresAt: exp,
        User: dto.UserDto{
            ID:          user.ID,
            Email:       user.Email,
            DisplayName: user.DisplayName,
            Role:        user.Role,
        },
    }, nil
}
```

`AILoginExchange` 接收 `*SATService` 當參數，避免在 `AuthService` struct 加新欄位（再次強調 strictly additive）。Wire 時在 handler 那層串。

## 2.9 Auth Handler 加 AILogin

```go
// internal/handlers/auth_handler.go (加 method)

// AuthHandler 既有 struct 加一個 sat 欄位（這算最小 invasive）：
// type AuthHandler struct {
//     svc *services.AuthService
//     sat *services.SATService  // NEW
// }
// func NewAuthHandler(svc *services.AuthService, sat *services.SATService) *AuthHandler {
//     return &AuthHandler{svc: svc, sat: sat}
// }
// → 影響：main.go 一行改 NewAuthHandler 呼叫處

// 新 method:
func (h *AuthHandler) AILogin(c *gin.Context) {
    var req dto.AILoginRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, dto.Fail[any]("請求格式錯誤"))
        return
    }
    authResp, err := h.svc.AILoginExchange(req.Token, h.sat)
    if err != nil {
        if errors.Is(err, apierror.ErrUnauthorized) {
            // 跟 Login 一致回 422
            c.JSON(http.StatusUnprocessableEntity, dto.Fail[any]("invalid credentials"))
            return
        }
        c.JSON(http.StatusInternalServerError, dto.Fail[any]("internal error"))
        return
    }
    c.JSON(http.StatusOK, dto.Ok(authResp, "ai-login 成功"))
}
```

**對 `NewAuthHandler` 簽名做 1 個微調**（多收 `*SATService`），main.go 對應改一行。這是唯一對既有 wire-up 的觸碰。

## 2.10 SAT Admin Handler

```go
// internal/handlers/sat_admin_handler.go (新檔)
type SATAdminHandler struct {
    svc *services.SATService
}

func NewSATAdminHandler(svc *services.SATService) *SATAdminHandler {
    return &SATAdminHandler{svc: svc}
}

// rejectSATSource 是 handler 內部 helper（R7）：拒絕 SAT-issued JWT 進來
func (h *SATAdminHandler) rejectSATSource(c *gin.Context) bool {
    claims, exists := c.Get("claims")
    if !exists {
        c.JSON(http.StatusUnauthorized, dto.Fail[any]("unauthorized"))
        return true
    }
    cl := claims.(*middleware.Claims)
    if cl.SatID != 0 {
        c.JSON(http.StatusForbidden, dto.Fail[any]("SAT-issued tokens cannot manage SAT"))
        return true
    }
    return false
}

func (h *SATAdminHandler) List(c *gin.Context) {
    if h.rejectSATSource(c) { return }
    // ...
}

func (h *SATAdminHandler) Create(c *gin.Context) {
    if h.rejectSATSource(c) { return }
    // 回 response 含 plaintext token（唯一一次）
}

func (h *SATAdminHandler) Update(c *gin.Context) {
    if h.rejectSATSource(c) { return }
    // PATCH name / expires_at / is_active
}

func (h *SATAdminHandler) Delete(c *gin.Context) {
    if h.rejectSATSource(c) { return }
    // soft delete: is_active = false
}
```

每個 admin endpoint 入口檢一行，省一個新 middleware。

## 2.11 Router 註冊

```go
// internal/router/router.go (加 routes，**簽名不變**)

// Handlers struct 加一欄
type Handlers struct {
    Auth     *handlers.AuthHandler
    Article  *handlers.ArticleHandler
    Admin    *handlers.AdminHandler
    Media    *handlers.MediaHandler
    Import   *handlers.ImportHandler
    Category *handlers.CategoryHandler
    SATAdmin *handlers.SATAdminHandler  // NEW
}

// Setup 簽名不變！
func Setup(cfg *config.Config, h Handlers, uploadDir string) *gin.Engine {
    // ...既有設定全不動...

    // 既有 loginLimiter 直接重用，不開新 limiter
    loginLimiter := middleware.NewRateLimiter(200, 1*time.Minute)
    auth := api.Group("/auth")
    {
        auth.POST("/login", loginLimiter.Limit(), h.Auth.Login)
        auth.POST("/ai-login", loginLimiter.Limit(), h.Auth.AILogin)  // NEW
        auth.GET("/me", middleware.AuthRequired(cfg.JWTSecret), h.Auth.Me)
    }

    // ...既有 public 路由全不動...

    admin := api.Group("/admin")
    admin.Use(middleware.AuthRequired(cfg.JWTSecret))  // **不變**
    admin.Use(middleware.AdminRequired())              // **不變**
    {
        // ...既有 register / articles / media / import / categories 全不動...

        // NEW：SAT 管理（R7 在 handler 內部檢，不用 middleware）
        admin.GET("/service-account-tokens", h.SATAdmin.List)
        admin.POST("/service-account-tokens", h.SATAdmin.Create)
        admin.PATCH("/service-account-tokens/:id", h.SATAdmin.Update)
        admin.DELETE("/service-account-tokens/:id", h.SATAdmin.Delete)
    }
    return r
}
```

注意：v3 沒有 `rate limiter thread-safety` 問題 — **因為沒新開 limiter，重用既有的**。既有 limiter 對 `/login` 用了多久，對 `/ai-login` 風險相同。要修是另一個 PR 的事，跟 SAT 解耦。

## 2.12 Rate Limiter 警告

既有 `middleware/ratelimit.go` 不是 thread-safe（codex P1 #6）。v3 重用既有 `loginLimiter` 給 `/ai-login`，**不新增 thread-safety 風險**——既有風險範圍多了一條 endpoint，但本質問題已存在於 `/login`。

**修法建議**：另開獨立小 PR 修 `ratelimit.go`，跟 SAT 解耦。可以 SAT MVP 部署完再做。

## 2.13 Audit Log

MVP 用結構化 log 寫 stdout（既有 log infra）：

```go
log.Info("sat_created",
    "actor_user_id", actorID,
    "sat_id", sat.ID,
    "target_user_id", sat.UserID,
    "name", sat.Name,
    "expires_at", sat.ExpiresAt,
)

log.Info("sat_login_success", "sat_id", sat.ID, "prefix", sat.TokenPrefix)
log.Info("sat_login_failed", "reason", "expired", "prefix", plaintext[:8])
log.Info("sat_revoked", "actor_user_id", actorID, "sat_id", sat.ID)
log.Info("sat_deleted", "actor_user_id", actorID, "sat_id", sat.ID)
```

未來需 retention 或查詢時再開 audit_log 表。

## 2.14 Frontend Admin Page

`frontend/src/app/(admin)/admin/tokens/page.tsx`：

```
┌────────────────────────────────────────────────────────────────┐
│ Service Account Tokens                  [+ 建立新 token]       │
├────────────────────────────────────────────────────────────────┤
│ 名稱             Prefix         狀態  到期         上次使用     │
│ Claude Code 發文 sat_OHBZeTK4   ✅    2026-12-31  3 分鐘前     │
│ CI 部署 bot      sat_aB3Xy12n   ✅    永久         從未         │
│ 舊測試 token     sat_QQQQwxxx   ❌    過期         昨天         │
└────────────────────────────────────────────────────────────────┘

[ 建立 modal ]
  名稱:      [____________]
  代理 user: [pin0513@gmail.com ▼]
  到期日:    [2026-12-31 ▼] [ ] 永久不過期
  [取消] [建立]

[ 建立成功 — 唯一一次顯示 ]
  ⚠️ 這個 token 只會顯示一次，請馬上複製保存

    sat_OHBZeTK4DaP8EdE4jn6y2czDavdN-9k3xv4QkX0p_aa

  [📋 複製] [我已存好（關閉）]
```

## 2.15 實作順序

| Step | 任務 | 預估 | PR |
|------|------|------|------|
| 1 | DB model + AutoMigrate 加入 | 30m | PR 1 |
| 2 | `sat_service.go`: Generate / Exchange / CRUD methods | 1.5h | PR 1 |
| 3 | `Claims` 加 `SatID` optional field | 5m | PR 1 |
| 4 | `auth_service.go`: 加 `AILoginExchange` method | 30m | PR 1 |
| 5 | `auth_handler.go`: 加 `AILogin` method + 改 `NewAuthHandler` 簽名 | 30m | PR 1 |
| 6 | `sat_admin_handler.go`: 新檔（List/Create/Update/Delete + RejectSAT helper） | 1.5h | PR 1 |
| 7 | `router.go`: 加 ai-login route + admin sat routes（**Setup 簽名不變**） | 15m | PR 1 |
| 8 | `main.go`: 一行改 `NewAuthHandler` 加 sat 參數 + 加 `NewSATAdminHandler` | 15m | PR 1 |
| 9 | **回歸測試**: 跑既有 user login + admin endpoint，確認沒壞（v3 預期 0 影響） | 30m | PR 1 |
| 10 | Unit test `sat_service` (Generate / Exchange / 各 error path) | 1.5h | PR 1 |
| 11 | Integration test: 建 SAT → AI-login 換 JWT → 用 JWT 打 API → 撤銷 → 等舊 JWT 自然過期或拿新失敗 | 1.5h | PR 1 |
| 12 | Frontend admin 頁 + API client | 2.5h | PR 2 |
| 13 | E2E test (Playwright) | 1h | PR 2 |
| 14 | 更新 CLAUDE.md | 30m | PR 2 |

**Total ~12h**, PR 1 全後端 ~7.5h，PR 2 全前端 + 文件 ~4h。

**PR 1 怎麼測第一張 SAT**：
```bash
# 用 admin 密碼登入拿 JWT
TOKEN=$(curl -sX POST .../api/auth/login -d '{...}' | jq -r .data.token)
# 建第一張 SAT
curl -X POST .../api/admin/service-account-tokens \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Claude Code","userId":1,"expiresAt":null}'
# response 含 plaintext token
```

## 2.16 部署

跟既有 frontend 部署同 pattern：

1. **DB migration** — GORM AutoMigrate（main.go 啟動自動跑）或手動 SQL
2. **Build go-server amd64**
3. **scp + load + restart go-server**
4. **驗證**：
   - 既有 admin JWT 仍能登入既有後台 ← **回歸測試 hard gate**
   - 用既有 admin JWT 建一張 SAT
   - 用 SAT 打 `/auth/ai-login` 換 JWT
   - 用 SAT-issued JWT 打 `/api/admin/articles` 看權限
   - 用 SAT-issued JWT 打 `/api/admin/service-account-tokens` 應該 403（R7）
   - 把 SAT 停用，等 1h 後新 exchange 失敗（撤銷生效）
5. **PR 2 部署**：build frontend + 部署

## 2.17 風險評估

| 風險 | 機率 | 緩解 |
|------|------|------|
| `Claims` 加 `SatID` 破壞既有 JWT decode | 極低 | `omitempty` + `uint` 零值，理論上 100% 相容 |
| 既有 admin JWT 受影響 | 極低 | v3 不改任何既有 middleware/handler/route |
| `NewAuthHandler` 簽名變導致 main.go 編不過 | 低 | 一行改，編譯期就會發現 |
| GORM AutoMigrate 新 table 失敗 | 低 | 標準操作，本 repo 已用過多次 |
| SAT 撤銷延遲 1h 期間 token 被濫用 | 視場景 | 接受，這是 MVP 設計取捨；緊急時可同時改 user 密碼讓 SAT 自動連動失效 |

**v3 不引入 v2 那 5 個 P1 中的任何一個** — 因為根本不動既有 contract。

---

# 附錄 A — v1 → v2 → v3 設計演化

| 階段 | 主要決策 | 結果 |
|------|------|------|
| **v1** | 嚴格 revocation (per-request DB check)、全套 spec | Codex 找出 7 P1 + 7 P2 |
| **v2** | 修 P1：role re-read、middleware 重整 | 引入 5 個 V2-P1（backward compat 災難） |
| **v3** | **重新規劃範圍**：放棄 immediate revocation、改 1h 短壽 JWT、strictly additive | **既有 code 0 動**，新功能純加法 |

v3 跟 v1/v2 的本質差別是**接受了「1 小時撤銷延遲」的取捨**。對個人 blog 這個取捨划算到不能再划算 — 換來零 backward compat 風險。

# 附錄 B — 如果之後需要 strict revocation 怎麼升級

v3 → strict revocation 的升級路徑（不需 schema 改動）：

1. middleware 加一個 SAT-aware wrapper：if `claims.SatID != 0` → 查 DB（cache 30s）
2. 把 user JWT exp 從 24h 砍到 1h，配合 refresh token（這是另一個 feature）
3. 把 role 從 JWT 拿掉，middleware 每 request 從 DB 讀 role
4. data model 不變

升級時機：
- SAT 數量超過 10 張
- 有 contractor / 短期 access 需求
- 出現一次 token 洩漏事件

# 附錄 C — 與既有 patterns 對照

| 系統 | 對應 |
|------|------|
| GitHub Personal Access Token | 同 pattern；prefix `ghp_` |
| Stripe API key | 同 pattern；prefix `sk_live_` |
| AWS access key | 兩段式 access key + secret |
| Vercel Token | 同 pattern；短壽 OAuth-like exchange |

---

# 變更記錄

- **2026-05-26 v1**: 初稿（Claude + Paul brainstorming）
- **2026-05-26 v2**: 過 codex review，試圖 fix 7 P1 + 7 P2 → 引入 5 個 V2-P1（backward compat 災難）
- **2026-05-26 v3**: 重新規劃範圍，採「strictly additive、接受 1h 撤銷延遲」MVP；**既有 code 0 動**
