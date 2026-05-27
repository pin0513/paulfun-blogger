package services

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"log"
	"strings"
	"time"

	"github.com/paulhuang/paulfun-blogger/internal/apierror"
	"github.com/paulhuang/paulfun-blogger/internal/dto"
	"github.com/paulhuang/paulfun-blogger/internal/models"
	"gorm.io/gorm"
)

const (
	SATPrefix       = "sat_"
	SATRawBytes     = 32
	SATFullLength   = 47 // "sat_" (4) + base64url(32 bytes, no padding) = 43
	SATPrefixLength = 12
)

// SATService 處理 service-account-token 的 CRUD 與 exchange 邏輯。
type SATService struct {
	db *gorm.DB
}

func NewSATService(db *gorm.DB) *SATService {
	return &SATService{db: db}
}

// generatePlaintext 產生 "sat_" + 32 bytes base64url 的 token 字串。
func generatePlaintext() (string, error) {
	raw := make([]byte, SATRawBytes)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	return SATPrefix + base64.RawURLEncoding.EncodeToString(raw), nil
}

func hashToken(plaintext string) string {
	sum := sha256.Sum256([]byte(plaintext))
	return hex.EncodeToString(sum[:])
}

// Create 建立一張新 SAT，回傳 (明文 token, model)。
// 明文 token 只在這個 return 看得到，DB 只存 SHA-256 hash。
func (s *SATService) Create(userID uint, name string, expiresAt *time.Time) (string, *models.ServiceAccountToken, error) {
	// 確認 user 存在且 active
	var user models.User
	if err := s.db.First(&user, userID).Error; err != nil {
		return "", nil, apierror.ErrBadRequest
	}
	if !user.IsActive {
		return "", nil, apierror.ErrBadRequest
	}

	plaintext, err := generatePlaintext()
	if err != nil {
		return "", nil, err
	}

	sat := &models.ServiceAccountToken{
		UserID:      userID,
		Name:        name,
		TokenHash:   hashToken(plaintext),
		TokenPrefix: plaintext[:SATPrefixLength],
		IsActive:    true,
		ExpiresAt:   expiresAt,
	}
	if err := s.db.Create(sat).Error; err != nil {
		return "", nil, err
	}
	log.Printf("[sat] created sat_id=%d user_id=%d name=%q prefix=%s", sat.ID, sat.UserID, sat.Name, sat.TokenPrefix)
	return plaintext, sat, nil
}

// ExchangeForUser 驗證 SAT 明文 token，回傳 (sat, user)。
// 任何失敗都回 apierror.ErrUnauthorized（外部一律 generic message，理由走 log）。
func (s *SATService) ExchangeForUser(plaintext string) (*models.ServiceAccountToken, *models.User, error) {
	// 格式 pre-check，省掉 DB 查
	if !strings.HasPrefix(plaintext, SATPrefix) || len(plaintext) != SATFullLength {
		log.Printf("[sat] login failed: bad format")
		return nil, nil, apierror.ErrUnauthorized
	}

	hashHex := hashToken(plaintext)
	prefix := plaintext[:8] // log 用（不洩漏完整 token）

	var sat models.ServiceAccountToken
	if err := s.db.Preload("User").Where("token_hash = ?", hashHex).First(&sat).Error; err != nil {
		log.Printf("[sat] login failed: not_found prefix=%s", prefix)
		return nil, nil, apierror.ErrUnauthorized
	}
	if !sat.IsActive {
		log.Printf("[sat] login failed: revoked sat_id=%d", sat.ID)
		return nil, nil, apierror.ErrUnauthorized
	}
	if sat.ExpiresAt != nil && time.Now().After(*sat.ExpiresAt) {
		log.Printf("[sat] login failed: expired sat_id=%d", sat.ID)
		return nil, nil, apierror.ErrUnauthorized
	}
	// User pointer + nil check (v3 design §2.5)
	if sat.User == nil || !sat.User.IsActive {
		log.Printf("[sat] login failed: user_inactive sat_id=%d", sat.ID)
		return nil, nil, apierror.ErrUnauthorized
	}

	// 更新 last_used_at（best-effort，失敗不阻擋）
	now := time.Now()
	if err := s.db.Model(&sat).Update("last_used_at", &now).Error; err != nil {
		log.Printf("[sat] failed to update last_used_at sat_id=%d: %v", sat.ID, err)
	}

	log.Printf("[sat] login success sat_id=%d user_id=%d", sat.ID, sat.UserID)
	return &sat, sat.User, nil
}

// List 列出所有 SAT（包含已停用的，方便 admin 看歷史）。
func (s *SATService) List() ([]dto.SATDto, error) {
	var sats []models.ServiceAccountToken
	if err := s.db.Order("created_at DESC").Find(&sats).Error; err != nil {
		return nil, err
	}
	result := make([]dto.SATDto, len(sats))
	for i, sat := range sats {
		result[i] = mapToSATDto(&sat)
	}
	return result, nil
}

// Update 部分更新 SAT 的 name / expires_at / is_active。
func (s *SATService) Update(id uint, req dto.SATUpdateRequest, actorUserID uint) (*dto.SATDto, error) {
	var sat models.ServiceAccountToken
	if err := s.db.First(&sat, id).Error; err != nil {
		return nil, apierror.ErrNotFound
	}

	updates := map[string]any{}
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	// expires_at 允許設成 nil（永不過期）—— 需要明確處理 nil case
	// 用 map[string]any + GORM 會把 nil interface 寫成 SQL NULL
	if req.ExpiresAt != nil {
		updates["expires_at"] = *req.ExpiresAt
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}

	if len(updates) > 0 {
		if err := s.db.Model(&sat).Updates(updates).Error; err != nil {
			return nil, err
		}
	}

	log.Printf("[sat] updated sat_id=%d actor_user_id=%d updates=%v", sat.ID, actorUserID, updates)

	// reload
	s.db.First(&sat, id)
	d := mapToSATDto(&sat)
	return &d, nil
}

// SoftDelete 將 SAT 標記為停用（is_active=false），保留 row 供 audit。
func (s *SATService) SoftDelete(id uint, actorUserID uint) error {
	var sat models.ServiceAccountToken
	if err := s.db.First(&sat, id).Error; err != nil {
		return apierror.ErrNotFound
	}
	if err := s.db.Model(&sat).Update("is_active", false).Error; err != nil {
		return err
	}
	log.Printf("[sat] soft_deleted sat_id=%d actor_user_id=%d", sat.ID, actorUserID)
	return nil
}

func mapToSATDto(sat *models.ServiceAccountToken) dto.SATDto {
	return dto.SATDto{
		ID:          sat.ID,
		UserID:      sat.UserID,
		Name:        sat.Name,
		TokenPrefix: sat.TokenPrefix,
		IsActive:    sat.IsActive,
		ExpiresAt:   sat.ExpiresAt,
		LastUsedAt:  sat.LastUsedAt,
		CreatedAt:   sat.CreatedAt,
		UpdatedAt:   sat.UpdatedAt,
	}
}
