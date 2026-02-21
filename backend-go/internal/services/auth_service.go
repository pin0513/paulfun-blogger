package services

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/paulhuang/paulfun-blogger/internal/config"
	"github.com/paulhuang/paulfun-blogger/internal/dto"
	"github.com/paulhuang/paulfun-blogger/internal/middleware"
	"github.com/paulhuang/paulfun-blogger/internal/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthService struct {
	db  *gorm.DB
	cfg *config.Config
}

func NewAuthService(db *gorm.DB, cfg *config.Config) *AuthService {
	return &AuthService{db: db, cfg: cfg}
}

func (s *AuthService) Login(req dto.LoginRequest) (dto.ApiResponse[dto.AuthResponse], error) {
	var user models.User
	if err := s.db.Where("email = ? AND is_active = true", req.Email).First(&user).Error; err != nil {
		return dto.Fail[dto.AuthResponse]("帳號或密碼錯誤"), nil
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return dto.Fail[dto.AuthResponse]("帳號或密碼錯誤"), nil
	}

	token, err := s.generateToken(&user)
	if err != nil {
		return dto.Fail[dto.AuthResponse]("Token 生成失敗"), err
	}

	refreshToken := generateRefreshToken()

	return dto.Ok(dto.AuthResponse{
		Token:        token,
		RefreshToken: refreshToken,
		User:         mapToUserDto(&user),
	}, "登入成功"), nil
}

func (s *AuthService) Register(req dto.RegisterRequest) (dto.ApiResponse[dto.AuthResponse], error) {
	var count int64
	s.db.Model(&models.User{}).Where("email = ?", req.Email).Count(&count)
	if count > 0 {
		return dto.Fail[dto.AuthResponse]("此 Email 已被註冊"), nil
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return dto.Fail[dto.AuthResponse]("密碼處理失敗"), err
	}

	user := models.User{
		Email:        req.Email,
		PasswordHash: string(hash),
		DisplayName:  req.DisplayName,
		Role:         "user",
		IsActive:     true,
	}
	if err := s.db.Create(&user).Error; err != nil {
		return dto.Fail[dto.AuthResponse]("註冊失敗"), err
	}

	token, err := s.generateToken(&user)
	if err != nil {
		return dto.Fail[dto.AuthResponse]("Token 生成失敗"), err
	}

	return dto.Ok(dto.AuthResponse{
		Token:        token,
		RefreshToken: generateRefreshToken(),
		User:         mapToUserDto(&user),
	}, "註冊成功"), nil
}

func (s *AuthService) GetUserByID(id uint) (*models.User, error) {
	var user models.User
	if err := s.db.First(&user, id).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

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

func mapToUserDto(u *models.User) dto.UserDto {
	return dto.UserDto{
		ID:          u.ID,
		Email:       u.Email,
		DisplayName: u.DisplayName,
		Avatar:      u.Avatar,
		Role:        u.Role,
	}
}
