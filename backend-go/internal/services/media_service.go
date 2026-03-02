package services

import (
	"context"
	"fmt"
	"mime/multipart"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/paulhuang/paulfun-blogger/internal/apierror"
	"github.com/paulhuang/paulfun-blogger/internal/dto"
	"github.com/paulhuang/paulfun-blogger/internal/models"
	"github.com/paulhuang/paulfun-blogger/internal/storage"
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
	db      *gorm.DB
	storage storage.Storage
}

func NewMediaService(db *gorm.DB, store storage.Storage) *MediaService {
	return &MediaService{db: db, storage: store}
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

	// storage key: "uploads/2026/03/uuid.jpg"
	key := fmt.Sprintf("uploads/%s/%s/%s", year, month, uniqueName)

	src, err := fileHeader.Open()
	if err != nil {
		return nil, fmt.Errorf("讀取檔案失敗: %w", err)
	}
	defer src.Close()

	url, err := s.storage.Upload(context.Background(), key, src, mimeType)
	if err != nil {
		return nil, err
	}

	media := models.Media{
		FileName:   fileHeader.Filename,
		FilePath:   key,
		FileSize:   fileHeader.Size,
		MimeType:   mimeType,
		UploadedBy: userID,
	}

	if err := s.db.Create(&media).Error; err != nil {
		return nil, fmt.Errorf("資料庫儲存失敗: %w", err)
	}

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

	// 刪除實體檔案
	_ = s.storage.Delete(context.Background(), media.FilePath)

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
	url := s.storage.URL(m.FilePath)

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
