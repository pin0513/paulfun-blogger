package dto

import "time"

// AILoginRequest — POST /api/auth/ai-login 的 body
type AILoginRequest struct {
	Token string `json:"token" binding:"required"`
}

// AILoginResponse — POST /api/auth/ai-login 的 200 response
type AILoginResponse struct {
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expiresAt"`
	User      UserDto   `json:"user"`
}

// SATCreateRequest — POST /api/admin/service-account-tokens
type SATCreateRequest struct {
	Name      string     `json:"name" binding:"required,max=100"`
	UserID    uint       `json:"userId" binding:"required"`
	ExpiresAt *time.Time `json:"expiresAt"` // nil = 永不過期
}

// SATUpdateRequest — PATCH /api/admin/service-account-tokens/:id
// 全部欄位選填；只更新有傳的。
type SATUpdateRequest struct {
	Name      *string    `json:"name"`
	ExpiresAt *time.Time `json:"expiresAt"`
	IsActive  *bool      `json:"isActive"`
}

// SATDto — list / get response item（不含 token_hash）
type SATDto struct {
	ID          uint       `json:"id"`
	UserID      uint       `json:"userId"`
	Name        string     `json:"name"`
	TokenPrefix string     `json:"tokenPrefix"`
	IsActive    bool       `json:"isActive"`
	ExpiresAt   *time.Time `json:"expiresAt"`
	LastUsedAt  *time.Time `json:"lastUsedAt"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   *time.Time `json:"updatedAt"`
}

// SATCreateResponse — Create 的 response，**唯一一次**含明文 token
type SATCreateResponse struct {
	SATDto
	Token string `json:"token"` // plaintext，僅此一次
}
