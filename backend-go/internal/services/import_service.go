package services

import (
	"fmt"
	"time"

	"github.com/paulhuang/paulfun-blogger/internal/dto"
	"github.com/paulhuang/paulfun-blogger/internal/models"
	"gorm.io/gorm"
)

// ImportService 處理批量匯入業務邏輯（分類 / 標籤 / 文章）。
// 所有匯入操作採 "slug 去重" 策略：slug 已存在則跳過（不覆蓋），新資料才建立。
type ImportService struct {
	db *gorm.DB
}

func NewImportService(db *gorm.DB) *ImportService {
	return &ImportService{db: db}
}

// ── Categories ────────────────────────────────────────────────────────────

func (s *ImportService) ImportCategories(req dto.ImportCategoriesRequest) (dto.ImportCategoriesResponse, error) {
	resp := dto.ImportCategoriesResponse{Items: make([]dto.ImportCategoryResult, 0, len(req.Categories))}

	for i, item := range req.Categories {
		slug := item.Slug
		if slug == "" {
			slug = generateSlug(item.Name)
		}

		var existing models.Category
		err := s.db.Where("slug = ?", slug).First(&existing).Error
		if err == nil {
			// slug 已存在 → 跳過
			resp.Skipped++
			resp.Items = append(resp.Items, dto.ImportCategoryResult{
				Name:    item.Name,
				Slug:    slug,
				ID:      existing.ID,
				Created: false,
			})
			continue
		}

		cat := models.Category{
			Name:      item.Name,
			Slug:      slug,
			SortOrder: item.SortOrder,
		}
		if cat.SortOrder == 0 {
			cat.SortOrder = i + 1
		}

		if err := s.db.Create(&cat).Error; err != nil {
			return resp, fmt.Errorf("建立分類 %q 失敗: %w", item.Name, err)
		}

		resp.Created++
		resp.Items = append(resp.Items, dto.ImportCategoryResult{
			Name:    item.Name,
			Slug:    slug,
			ID:      cat.ID,
			Created: true,
		})
	}

	return resp, nil
}

// ── Tags ─────────────────────────────────────────────────────────────────

func (s *ImportService) ImportTags(req dto.ImportTagsRequest) (dto.ImportTagsResponse, error) {
	resp := dto.ImportTagsResponse{Items: make([]dto.ImportTagResult, 0, len(req.Tags))}

	for _, item := range req.Tags {
		slug := item.Slug
		if slug == "" {
			slug = generateSlug(item.Name)
		}

		var existing models.Tag
		err := s.db.Where("slug = ?", slug).First(&existing).Error
		if err == nil {
			resp.Skipped++
			resp.Items = append(resp.Items, dto.ImportTagResult{
				Name:    item.Name,
				Slug:    slug,
				ID:      existing.ID,
				Created: false,
			})
			continue
		}

		tag := models.Tag{Name: item.Name, Slug: slug}
		if err := s.db.Create(&tag).Error; err != nil {
			return resp, fmt.Errorf("建立標籤 %q 失敗: %w", item.Name, err)
		}

		resp.Created++
		resp.Items = append(resp.Items, dto.ImportTagResult{
			Name:    item.Name,
			Slug:    slug,
			ID:      tag.ID,
			Created: true,
		})
	}

	return resp, nil
}

// ── Articles ─────────────────────────────────────────────────────────────

func (s *ImportService) ImportArticles(req dto.ImportArticlesRequest, authorID uint) (dto.ImportArticlesResponse, error) {
	resp := dto.ImportArticlesResponse{Items: make([]dto.ImportArticleResult, 0, len(req.Articles))}

	// 預載分類/標籤 lookup map（避免 N+1 query）
	catMap := s.buildCategorySlugMap()
	tagMap := s.buildTagSlugMap()

	for _, item := range req.Articles {
		result, err := s.importOneArticle(item, authorID, catMap, tagMap, req.Update)
		if err != nil {
			resp.Failed++
			resp.Items = append(resp.Items, dto.ImportArticleResult{
				Title: item.Title,
				Slug:  item.Slug,
				Error: err.Error(),
			})
			continue
		}

		if result.Created {
			resp.Created++
		} else {
			resp.Skipped++
		}
		resp.Items = append(resp.Items, result)
	}

	return resp, nil
}

// importOneArticle 匯入單篇文章。slug 已存在時：update=true 則更新 content；否則跳過。
func (s *ImportService) importOneArticle(
	item dto.ImportArticleItem,
	authorID uint,
	catMap map[string]uint,
	tagMap map[string]uint,
	update bool,
) (dto.ImportArticleResult, error) {

	slug := item.Slug
	if slug == "" {
		slug = generateSlug(item.Title)
	}

	// slug 去重
	var existing models.Article
	if err := s.db.Where("slug = ?", slug).First(&existing).Error; err == nil {
		if update {
			// 更新已存在文章的 content 與 summary
			updates := map[string]interface{}{}
			if item.Content != nil {
				updates["content"] = *item.Content
			}
			if item.Summary != nil {
				updates["summary"] = *item.Summary
			}
			if len(updates) > 0 {
				if err := s.db.Model(&existing).Updates(updates).Error; err != nil {
					return dto.ImportArticleResult{}, fmt.Errorf("更新文章 %q 失敗: %w", item.Title, err)
				}
			}
		}
		return dto.ImportArticleResult{
			Title:   item.Title,
			Slug:    slug,
			ID:      existing.ID,
			Created: false,
		}, nil
	}

	// 確保 slug 唯一（生成衝突時加後綴）
	uniqueSlug := slug
	for i := 1; ; i++ {
		var cnt int64
		s.db.Model(&models.Article{}).Where("slug = ?", uniqueSlug).Count(&cnt)
		if cnt == 0 {
			break
		}
		uniqueSlug = fmt.Sprintf("%s-%d", slug, i)
	}

	article := models.Article{
		Title:      item.Title,
		Slug:       uniqueSlug,
		Summary:    item.Summary,
		Content:    item.Content,
		CoverImage: item.CoverImage,
		AuthorID:   authorID,
		Status:     "draft",
	}

	// 關聯分類（slug 對應）
	if item.CategorySlug != "" {
		if catID, ok := catMap[item.CategorySlug]; ok {
			article.CategoryID = &catID
		}
	}

	// 關聯標籤
	if len(item.TagSlugs) > 0 {
		var tags []models.Tag
		for _, ts := range item.TagSlugs {
			if tagID, ok := tagMap[ts]; ok {
				tags = append(tags, models.Tag{ID: tagID})
			}
		}
		article.Tags = tags
	}

	// 發佈設定
	if item.Publish {
		article.Status = "published"
		if item.PublishedAt != nil {
			article.PublishedAt = item.PublishedAt
		} else {
			now := time.Now().UTC()
			article.PublishedAt = &now
		}
	}

	if err := s.db.Create(&article).Error; err != nil {
		return dto.ImportArticleResult{}, fmt.Errorf("建立文章 %q 失敗: %w", item.Title, err)
	}

	return dto.ImportArticleResult{
		Title:   item.Title,
		Slug:    uniqueSlug,
		ID:      article.ID,
		Created: true,
	}, nil
}

// ── 內部 helpers ──────────────────────────────────────────────────────────

func (s *ImportService) buildCategorySlugMap() map[string]uint {
	var cats []models.Category
	s.db.Find(&cats)
	m := make(map[string]uint, len(cats))
	for _, c := range cats {
		m[c.Slug] = c.ID
	}
	return m
}

func (s *ImportService) buildTagSlugMap() map[string]uint {
	var tags []models.Tag
	s.db.Find(&tags)
	m := make(map[string]uint, len(tags))
	for _, t := range tags {
		m[t.Slug] = t.ID
	}
	return m
}
