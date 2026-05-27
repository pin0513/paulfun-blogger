package models

import "time"

// ServiceAccountToken 代表一張 service-account-token（SAT），
// 用於 AI agent / CI / 外部 script 透過 POST /api/auth/ai-login
// 取得短壽 JWT（1h），免去使用人類密碼。
//
// 設計與取捨見 docs/specs/2026-05-26-service-account-token-design.md (v3)。
type ServiceAccountToken struct {
	ID          uint       `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID      uint       `gorm:"not null;index" json:"userId"`
	User        *User      `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	Name        string     `gorm:"not null;size:100" json:"name"`
	TokenHash   string     `gorm:"not null;size:64;uniqueIndex" json:"-"`     // SHA-256 hex
	TokenPrefix string     `gorm:"not null;size:12" json:"tokenPrefix"`        // "sat_" + 8 chars
	IsActive    bool       `gorm:"not null;default:true" json:"isActive"`
	ExpiresAt   *time.Time `json:"expiresAt"`                                  // nil = 永不過期
	LastUsedAt  *time.Time `json:"lastUsedAt"`                                 // exchange 時更新
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   *time.Time `json:"updatedAt"`
}
