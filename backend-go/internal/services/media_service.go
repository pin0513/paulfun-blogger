package services

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/paulhuang/paulfun-blogger/internal/apierror"
	"github.com/paulhuang/paulfun-blogger/internal/config"
	"github.com/paulhuang/paulfun-blogger/internal/dto"
	"github.com/paulhuang/paulfun-blogger/internal/models"
	"gorm.io/gorm"
)

var allowedMimeTypes = map[string]bool{
	"image/jpeg":    true,
	"image/png":     true,
	"image/gif":     true,
	"image/webp":    true,
	"image/svg+xml": true,
}

const maxFileSize = 5 * 1024 * 1024 // 5MB

// MediaService 處理媒體上傳、查詢、刪除業務邏輯。
type MediaService struct {
	db  *gorm.DB
	cfg *config.Config
}

func NewMediaService(db *gorm.DB, cfg *config.Config) *MediaService {
	return &MediaService{db: db, cfg: cfg}
}

// GetMedia 查詢媒體列表（分頁 + 篩選）。
func (s *MediaService) GetMedia(q dto.MediaQueryParams) (dto.PagedResponse[dto.MediaDto], error) {
	query := s.db.Model(&models.Media{}).Preload("Uploader")

	if q.MimeType != "" {
		query = query.Where("mime_type LIKE ?", q.MimeType+"%")
	}
	if q.Search != "" {
		query = query.Where("LOWER(file_name) LIKE ?", "%"+strings.ToLower(q.Search)+"%")
	}

	var totalCount int64
	query.Count(&totalCount)

	page := q.GetPage()
	pageSize := q.GetPageSize()

	var media []models.Media
	if err := query.Order("created_at DESC").
		Offset((page - 1) * pageSize).Limit(pageSize).
		Find(&media).Error; err != nil {
		return dto.PagedResponse[dto.MediaDto]{}, err
	}

	items := make([]dto.MediaDto, len(media))
	for i, m := range media {
		items[i] = s.mapToDto(m)
	}

	return dto.PagedResponse[dto.MediaDto]{
		Items:      items,
		TotalCount: int(totalCount),
		Page:       page,
		PageSize:   pageSize,
	}, nil
}

// GetMediaByID 取得單一媒體資訊。
func (s *MediaService) GetMediaByID(id uint) (*dto.MediaDto, error) {
	var media models.Media
	if err := s.db.Preload("Uploader").First(&media, id).Error; err != nil {
		return nil, apierror.ErrNotFound
	}
	d := s.mapToDto(media)
	return &d, nil
}

// Upload 驗證並儲存上傳檔案，寫入資料庫後回傳媒體 DTO。
// 業務層驗證失敗回傳 apierror.ErrBadRequest（帶自訂訊息）。
func (s *MediaService) Upload(fileHeader *multipart.FileHeader, userID uint) (*dto.UploadMediaResponse, error) {
	if fileHeader.Size > maxFileSize {
		return nil, fmt.Errorf("檔案大小不能超過 5MB: %w", apierror.ErrBadRequest)
	}

	mimeType := fileHeader.Header.Get("Content-Type")
	if !allowedMimeTypes[strings.ToLower(mimeType)] {
		return nil, fmt.Errorf("不支援的檔案格式，僅允許 JPEG, PNG, GIF, WebP, SVG: %w", apierror.ErrBadRequest)
	}

	ext := filepath.Ext(fileHeader.Filename)
	uniqueName := uuid.New().String() + ext
	year := time.Now().UTC().Format("2006")
	month := time.Now().UTC().Format("01")

	relPath := filepath.Join("uploads", year, month)
	absPath := filepath.Join(s.cfg.UploadDir, year, month)

	if err := os.MkdirAll(absPath, 0755); err != nil {
		return nil, fmt.Errorf("無法建立上傳目錄: %w", err)
	}

	filePath := filepath.Join(relPath, uniqueName)
	fullPath := filepath.Join(s.cfg.UploadDir, year, month, uniqueName)

	src, err := fileHeader.Open()
	if err != nil {
		return nil, fmt.Errorf("讀取檔案失敗: %w", err)
	}
	defer src.Close()

	dst, err := os.Create(fullPath)
	if err != nil {
		return nil, fmt.Errorf("儲存檔案失敗: %w", err)
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		return nil, fmt.Errorf("寫入檔案失敗: %w", err)
	}

	// 統一使用斜線（跨平台相容）
	storedPath := strings.ReplaceAll(filePath, "\\", "/")

	media := models.Media{
		FileName:   fileHeader.Filename,
		FilePath:   storedPath,
		FileSize:   fileHeader.Size,
		MimeType:   mimeType,
		UploadedBy: userID,
	}

	if err := s.db.Create(&media).Error; err != nil {
		return nil, fmt.Errorf("資料庫儲存失敗: %w", err)
	}

	url := fmt.Sprintf("%s/%s", s.cfg.BaseURL, storedPath)
	return &dto.UploadMediaResponse{
		ID:       media.ID,
		FileName: media.FileName,
		Url:      url,
		FileSize: media.FileSize,
		MimeType: media.MimeType,
	}, nil
}

// Delete 刪除媒體（僅上傳者或 admin 可操作）。
func (s *MediaService) Delete(id uint, userID uint) error {
	var media models.Media
	if err := s.db.First(&media, id).Error; err != nil {
		return apierror.ErrNotFound
	}

	if err := s.checkOwnerOrAdmin(media.UploadedBy, userID); err != nil {
		return err
	}

	// 刪除實體檔案（忽略不存在的情況）
	fullPath := filepath.Join(s.cfg.UploadDir, strings.TrimPrefix(media.FilePath, "uploads/"))
	if _, err := os.Stat(fullPath); err == nil {
		os.Remove(fullPath)
	}

	if err := s.db.Delete(&media).Error; err != nil {
		return fmt.Errorf("刪除失敗: %w", err)
	}
	return nil
}

// ── 內部 helpers ──────────────────────────────────────────────────────────

func (s *MediaService) checkOwnerOrAdmin(ownerID, requesterID uint) error {
	if ownerID == requesterID {
		return nil
	}
	var user models.User
	s.db.Select("role").First(&user, requesterID)
	if user.Role == "admin" {
		return nil
	}
	return apierror.ErrForbidden
}

func (s *MediaService) mapToDto(m models.Media) dto.MediaDto {
	url := fmt.Sprintf("%s/%s", s.cfg.BaseURL, m.FilePath)

	var uploader *dto.UserDto
	if m.Uploader.ID != 0 {
		u := mapToUserDto(&m.Uploader)
		uploader = &u
	}

	return dto.MediaDto{
		ID:         m.ID,
		FileName:   m.FileName,
		FilePath:   m.FilePath,
		Url:        url,
		FileSize:   m.FileSize,
		MimeType:   m.MimeType,
		UploadedBy: m.UploadedBy,
		Uploader:   uploader,
		CreatedAt:  m.CreatedAt,
	}
}
