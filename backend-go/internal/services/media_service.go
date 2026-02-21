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

type MediaService struct {
	db  *gorm.DB
	cfg *config.Config
}

func NewMediaService(db *gorm.DB, cfg *config.Config) *MediaService {
	return &MediaService{db: db, cfg: cfg}
}

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

func (s *MediaService) GetMediaByID(id uint) (*dto.MediaDto, error) {
	var media models.Media
	if err := s.db.Preload("Uploader").First(&media, id).Error; err != nil {
		return nil, err
	}
	d := s.mapToDto(media)
	return &d, nil
}

func (s *MediaService) Upload(fileHeader *multipart.FileHeader, userID uint) (dto.ApiResponse[dto.UploadMediaResponse], error) {
	if fileHeader.Size > maxFileSize {
		return dto.Fail[dto.UploadMediaResponse]("檔案大小不能超過 5MB"), nil
	}

	mimeType := fileHeader.Header.Get("Content-Type")
	if !allowedMimeTypes[strings.ToLower(mimeType)] {
		return dto.Fail[dto.UploadMediaResponse]("不支援的檔案格式，僅允許 JPEG, PNG, GIF, WebP, SVG"), nil
	}

	ext := filepath.Ext(fileHeader.Filename)
	uniqueName := uuid.New().String() + ext
	year := time.Now().UTC().Format("2006")
	month := time.Now().UTC().Format("01")

	relPath := filepath.Join("uploads", year, month)
	absPath := filepath.Join(s.cfg.UploadDir, year, month)

	if err := os.MkdirAll(absPath, 0755); err != nil {
		return dto.Fail[dto.UploadMediaResponse]("無法建立上傳目錄"), err
	}

	filePath := filepath.Join(relPath, uniqueName)
	fullPath := filepath.Join(s.cfg.UploadDir, year, month, uniqueName)

	src, err := fileHeader.Open()
	if err != nil {
		return dto.Fail[dto.UploadMediaResponse]("讀取檔案失敗"), err
	}
	defer src.Close()

	dst, err := os.Create(fullPath)
	if err != nil {
		return dto.Fail[dto.UploadMediaResponse]("儲存檔案失敗"), err
	}
	defer dst.Close()

	if _, err := io.Copy(dst, src); err != nil {
		return dto.Fail[dto.UploadMediaResponse]("寫入檔案失敗"), err
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
		return dto.Fail[dto.UploadMediaResponse]("資料庫儲存失敗"), err
	}

	url := fmt.Sprintf("%s/%s", s.cfg.BaseURL, storedPath)

	return dto.Ok(dto.UploadMediaResponse{
		ID:       media.ID,
		FileName: media.FileName,
		Url:      url,
		FileSize: media.FileSize,
		MimeType: media.MimeType,
	}, "上傳成功"), nil
}

func (s *MediaService) Delete(id uint, userID uint) (dto.ApiResponse[bool], error) {
	var media models.Media
	if err := s.db.First(&media, id).Error; err != nil {
		return dto.Fail[bool]("檔案不存在"), nil
	}

	var user models.User
	s.db.First(&user, userID)
	if media.UploadedBy != userID && user.Role != "admin" {
		return dto.Fail[bool]("沒有權限刪除此檔案"), nil
	}

	// 刪除實體檔案
	fullPath := filepath.Join(s.cfg.UploadDir, strings.TrimPrefix(media.FilePath, "uploads/"))
	if _, err := os.Stat(fullPath); err == nil {
		os.Remove(fullPath)
	}

	if err := s.db.Delete(&media).Error; err != nil {
		return dto.Fail[bool]("刪除失敗"), err
	}

	return dto.Ok(true, "刪除成功"), nil
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
