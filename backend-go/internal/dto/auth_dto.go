package dto

// ── Request ──────────────────────────────────────────────────

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type RegisterRequest struct {
	Email       string `json:"email" binding:"required,email"`
	Password    string `json:"password" binding:"required,min=6"`
	DisplayName string `json:"displayName" binding:"required"`
}

// ── Response ─────────────────────────────────────────────────

type UserDto struct {
	ID          uint    `json:"id"`
	Email       string  `json:"email"`
	DisplayName string  `json:"displayName"`
	Avatar      *string `json:"avatar"`
	Role        string  `json:"role"`
}

type AuthResponse struct {
	Token        string  `json:"token"`
	RefreshToken string  `json:"refreshToken"`
	User         UserDto `json:"user"`
}
