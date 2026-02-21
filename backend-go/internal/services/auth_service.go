package services

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/paulhuang/paulfun-blogger/internal/apierror"
	"github.com/paulhuang/paulfun-blogger/internal/config"
	"github.com/paulhuang/paulfun-blogger/internal/dto"
	"github.com/paulhuang/paulfun-blogger/internal/middleware"
	"github.com/paulhuang/paulfun-blogger/internal/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// AuthService 處理認證相關業務邏輯（登入、註冊、JWT 生成）。
type AuthService struct {
	db  *gorm.DB
	cfg *config.Config
}

func NewAuthService(db *gorm.DB, cfg *config.Config) *AuthService {
	return &AuthService{db: db, cfg: cfg}
}

// Login 驗證帳號密碼，成功回傳 AuthResponse；
// 帳密錯誤回傳 apierror.ErrUnauthorized（handler 應以 422 回應避免前端 401 interceptor 攔截）。
func (s *AuthService) Login(req dto.LoginRequest) (*dto.AuthResponse, error) {
	var user models.User
	if err := s.db.Where("email = ? AND is_active = true", req.Email).First(&user).Error; err != nil {
		return nil, apierror.ErrUnauthorized
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return nil, apierror.ErrUnauthorized
	}

	token, err := s.generateToken(&user)
	if err != nil {
		return nil, fmt.Errorf("Token 生成失敗: %w", err)
	}

	return &dto.AuthResponse{
		Token:        token,
		RefreshToken: generateRefreshToken(),
		User:         mapToUserDto(&user),
	}, nil
}

// Register 建立新帳號；Email 重複回傳 apierror.ErrConflict。
func (s *AuthService) Register(req dto.RegisterRequest) (*dto.AuthResponse, error) {
	var count int64
	s.db.Model(&models.User{}).Where("email = ?", req.Email).Count(&count)
	if count > 0 {
		return nil, apierror.ErrConflict
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("密碼處理失敗: %w", err)
	}

	user := models.User{
		Email:        req.Email,
		PasswordHash: string(hash),
		DisplayName:  req.DisplayName,
		Role:         "user",
		IsActive:     true,
	}
	if err := s.db.Create(&user).Error; err != nil {
		return nil, fmt.Errorf("註冊失敗: %w", err)
	}

	token, err := s.generateToken(&user)
	if err != nil {
		return nil, fmt.Errorf("Token 生成失敗: %w", err)
	}

	return &dto.AuthResponse{
		Token:        token,
		RefreshToken: generateRefreshToken(),
		User:         mapToUserDto(&user),
	}, nil
}

// GetUserByID 取得使用者資料（供 /auth/me 使用）。
func (s *AuthService) GetUserByID(id uint) (*models.User, error) {
	var user models.User
	if err := s.db.First(&user, id).Error; err != nil {
		return nil, apierror.ErrNotFound
	}
	return &user, nil
}

// ── 內部 helpers ──────────────────────────────────────────────────────────

func (s *AuthService) generateToken(user *models.User) (string, error) {
	now := time.Now()
	claims := middleware.Claims{
		Sub:   fmt.Sprintf("%d", user.ID),
		Email: user.Email,
		Name:  user.DisplayName,
		Role:  user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   fmt.Sprintf("%d", user.ID),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Duration(s.cfg.JWTExpireHours) * time.Hour)),
			Issuer:    "PaulFunBlogger",
			Audience:  jwt.ClaimStrings{"PaulFunBloggerUsers"},
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.cfg.JWTSecret))
}

func generateRefreshToken() string {
	b := make([]byte, 48)
	rand.Read(b)
	return base64.StdEncoding.EncodeToString(b)
}

// mapToUserDto 轉換 User model 為 DTO（在 services 套件共用）。
func mapToUserDto(u *models.User) dto.UserDto {
	return dto.UserDto{
		ID:          u.ID,
		Email:       u.Email,
		DisplayName: u.DisplayName,
		Avatar:      u.Avatar,
		Role:        u.Role,
	}
}
