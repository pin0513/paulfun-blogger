package services

import (
	"fmt"
	"regexp"
	"strings"
	"time"
	"unicode"

	"github.com/paulhuang/paulfun-blogger/internal/apierror"
	"github.com/paulhuang/paulfun-blogger/internal/dto"
	"github.com/paulhuang/paulfun-blogger/internal/models"
	"gorm.io/gorm"
)

// ArticleService 處理文章相關業務邏輯。
type ArticleService struct {
	db *gorm.DB
}

func NewArticleService(db *gorm.DB) *ArticleService {
	return &ArticleService{db: db}
}

// GetArticles 查詢文章列表（分頁 + 篩選）。
// includeUnpublished=true 用於後台；false 用於前台（僅顯示已發佈）。
func (s *ArticleService) GetArticles(q dto.ArticleQueryParams, includeUnpublished bool) (dto.PagedResponse[dto.ArticleListItemDto], error) {
	query := s.db.Model(&models.Article{}).
		Preload("Author").
		Preload("Category").
		Preload("Tags")

	if !includeUnpublished {
		now := time.Now().UTC()
		query = query.Where("status = ? AND published_at <= ?", "published", now)
	} else if q.Status != "" {
		query = query.Where("status = ?", q.Status)
	}

	if q.CategoryID != nil {
		query = query.Where("category_id = ?", *q.CategoryID)
	}

	if q.TagID != nil {
		query = query.Joins("JOIN article_tags ON article_tags.article_id = articles.id").
			Where("article_tags.tag_id = ?", *q.TagID)
	}

	if q.Search != "" {
		like := "%" + strings.ToLower(q.Search) + "%"
		query = query.Where("LOWER(title) LIKE ? OR LOWER(summary) LIKE ?", like, like)
	}

	var totalCount int64
	if err := query.Count(&totalCount).Error; err != nil {
		return dto.PagedResponse[dto.ArticleListItemDto]{}, err
	}

	sortBy := strings.ToLower(q.GetSortBy())
	dir := "DESC"
	if !q.Descending {
		dir = "ASC"
	}
	switch sortBy {
	case "title":
		query = query.Order("title " + dir)
	case "publishedat":
		query = query.Order("published_at " + dir)
	case "viewcount":
		query = query.Order("view_count " + dir)
	default:
		query = query.Order("created_at " + dir)
	}

	page := q.GetPage()
	pageSize := q.GetPageSize()

	var articles []models.Article
	if err := query.Offset((page - 1) * pageSize).Limit(pageSize).Find(&articles).Error; err != nil {
		return dto.PagedResponse[dto.ArticleListItemDto]{}, err
	}

	items := make([]dto.ArticleListItemDto, len(articles))
	for i, a := range articles {
		items[i] = mapToListItemDto(a)
	}

	totalPages := (int(totalCount) + pageSize - 1) / pageSize
	if totalPages == 0 {
		totalPages = 1
	}
	return dto.PagedResponse[dto.ArticleListItemDto]{
		Items:           items,
		TotalCount:      int(totalCount),
		Page:            page,
		PageSize:        pageSize,
		TotalPages:      totalPages,
		HasPreviousPage: page > 1,
		HasNextPage:     page < totalPages,
	}, nil
}

// GetArticleByID 取得單篇文章（後台使用，不限 status）。
func (s *ArticleService) GetArticleByID(id uint) (*dto.ArticleDto, error) {
	var article models.Article
	if err := s.db.Preload("Author").Preload("Category").Preload("Tags").
		First(&article, id).Error; err != nil {
		return nil, apierror.ErrNotFound
	}
	d := mapToDto(article)
	return &d, nil
}

// GetPublishedArticleByID 取得已發佈文章（前台使用，以 ID 查詢）。
func (s *ArticleService) GetPublishedArticleByID(id uint) (*dto.ArticleDto, error) {
	now := time.Now().UTC()
	var article models.Article
	if err := s.db.Preload("Author").Preload("Category").Preload("Tags").
		Where("id = ? AND status = ? AND published_at <= ?", id, "published", now).
		First(&article).Error; err != nil {
		return nil, apierror.ErrNotFound
	}
	d := mapToDto(article)
	return &d, nil
}

// CreateArticle 建立草稿文章。
func (s *ArticleService) CreateArticle(req dto.CreateArticleRequest, authorID uint) (*dto.ArticleDto, error) {
	slug := generateSlug(req.Title)
	base := slug
	for i := 1; ; i++ {
		var cnt int64
		s.db.Model(&models.Article{}).Where("slug = ?", slug).Count(&cnt)
		if cnt == 0 {
			break
		}
		slug = fmt.Sprintf("%s-%d", base, i)
	}

	article := models.Article{
		Title:      req.Title,
		Slug:       slug,
		Summary:    req.Summary,
		Content:    req.Content,
		CoverImage: req.CoverImage,
		CategoryID: req.CategoryID,
		AuthorID:   authorID,
		Status:     "draft",
	}

	if len(req.TagIDs) > 0 {
		var tags []models.Tag
		s.db.Where("id IN ?", req.TagIDs).Find(&tags)
		article.Tags = tags
	}

	if err := s.db.Create(&article).Error; err != nil {
		return nil, err
	}

	s.db.Preload("Author").Preload("Category").Preload("Tags").First(&article, article.ID)
	d := mapToDto(article)
	return &d, nil
}

// UpdateArticle 更新文章內容（僅作者或 admin 可操作）。
func (s *ArticleService) UpdateArticle(id uint, req dto.UpdateArticleRequest, userID uint) (*dto.ArticleDto, error) {
	var article models.Article
	if err := s.db.Preload("Tags").First(&article, id).Error; err != nil {
		return nil, apierror.ErrNotFound
	}

	if err := s.checkOwnerOrAdmin(article.AuthorID, userID); err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	article.Title = req.Title
	article.Summary = req.Summary
	article.Content = req.Content
	article.CoverImage = req.CoverImage
	article.CategoryID = req.CategoryID
	article.UpdatedAt = &now
	article.Version++

	s.db.Model(&article).Association("Tags").Clear()
	if len(req.TagIDs) > 0 {
		var tags []models.Tag
		s.db.Where("id IN ?", req.TagIDs).Find(&tags)
		s.db.Model(&article).Association("Tags").Replace(tags)
	}

	if err := s.db.Save(&article).Error; err != nil {
		return nil, err
	}

	s.db.Preload("Author").Preload("Category").Preload("Tags").First(&article, article.ID)
	d := mapToDto(article)
	return &d, nil
}

// DeleteArticle 刪除文章（僅作者或 admin 可操作）。
func (s *ArticleService) DeleteArticle(id uint, userID uint) error {
	var article models.Article
	if err := s.db.First(&article, id).Error; err != nil {
		return apierror.ErrNotFound
	}

	if err := s.checkOwnerOrAdmin(article.AuthorID, userID); err != nil {
		return err
	}

	if err := s.db.Delete(&article).Error; err != nil {
		return err
	}
	return nil
}

// PublishArticle 發佈文章（立即或排程）。
func (s *ArticleService) PublishArticle(id uint, req *dto.PublishArticleRequest, userID uint) (*dto.ArticleDto, error) {
	var article models.Article
	if err := s.db.Preload("Author").Preload("Category").Preload("Tags").First(&article, id).Error; err != nil {
		return nil, apierror.ErrNotFound
	}

	if err := s.checkOwnerOrAdmin(article.AuthorID, userID); err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	if req != nil && req.ScheduledAt != nil {
		article.Status = "scheduled"
		article.PublishedAt = req.ScheduledAt
	} else {
		article.Status = "published"
		article.PublishedAt = &now
	}
	article.UpdatedAt = &now

	if err := s.db.Save(&article).Error; err != nil {
		return nil, err
	}

	d := mapToDto(article)
	return &d, nil
}

// UnpublishArticle 將文章回退為草稿。
func (s *ArticleService) UnpublishArticle(id uint, userID uint) (*dto.ArticleDto, error) {
	var article models.Article
	if err := s.db.Preload("Author").Preload("Category").Preload("Tags").First(&article, id).Error; err != nil {
		return nil, apierror.ErrNotFound
	}

	if err := s.checkOwnerOrAdmin(article.AuthorID, userID); err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	article.Status = "draft"
	article.PublishedAt = nil
	article.UpdatedAt = &now

	if err := s.db.Save(&article).Error; err != nil {
		return nil, err
	}

	d := mapToDto(article)
	return &d, nil
}

// IncrementViewCount 非同步更新瀏覽數（fire-and-forget）。
func (s *ArticleService) IncrementViewCount(id uint) {
	s.db.Model(&models.Article{}).Where("id = ?", id).
		UpdateColumn("view_count", gorm.Expr("view_count + 1"))
}

// GetCategories 取得所有分類（含已發佈文章數）。
func (s *ArticleService) GetCategories() ([]dto.CategoryDto, error) {
	type catWithCount struct {
		ID           uint
		Name         string
		Slug         string
		ParentID     *uint
		SortOrder    int
		ArticleCount int
	}

	now := time.Now().UTC()
	var rows []catWithCount
	if err := s.db.Raw(`
		SELECT c.id, c.name, c.slug, c.parent_id, c.sort_order,
		       COUNT(a.id) AS article_count
		FROM categories c
		LEFT JOIN articles a
		       ON a.category_id = c.id
		          AND a.status = 'published'
		          AND a.published_at <= ?
		GROUP BY c.id, c.name, c.slug, c.parent_id, c.sort_order
		ORDER BY c.sort_order ASC
	`, now).Scan(&rows).Error; err != nil {
		return nil, err
	}

	result := make([]dto.CategoryDto, len(rows))
	for i, r := range rows {
		result[i] = dto.CategoryDto{
			ID:           r.ID,
			Name:         r.Name,
			Slug:         r.Slug,
			ParentID:     r.ParentID,
			SortOrder:    r.SortOrder,
			ArticleCount: r.ArticleCount,
		}
	}
	return result, nil
}

// GetTags 取得所有標籤。
func (s *ArticleService) GetTags() ([]dto.TagDto, error) {
	var tags []models.Tag
	if err := s.db.Find(&tags).Error; err != nil {
		return nil, err
	}
	result := make([]dto.TagDto, len(tags))
	for i, t := range tags {
		result[i] = dto.TagDto{ID: t.ID, Name: t.Name, Slug: t.Slug}
	}
	return result, nil
}

// ── 內部 helpers ──────────────────────────────────────────────────────────

// checkOwnerOrAdmin 確認 userID 是文章作者或系統管理員。
func (s *ArticleService) checkOwnerOrAdmin(ownerID, requesterID uint) error {
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

// ── slug 生成 ──────────────────────────────────────────────────────────────

var nonWordRe = regexp.MustCompile(`[^\w\p{Han}\s-]`)
var multiSpaceRe = regexp.MustCompile(`\s+`)
var multiDashRe = regexp.MustCompile(`-+`)

func generateSlug(title string) string {
	slug := strings.ToLower(strings.TrimSpace(title))
	slug = nonWordRe.ReplaceAllString(slug, "")
	slug = multiSpaceRe.ReplaceAllString(slug, "-")
	slug = multiDashRe.ReplaceAllString(slug, "-")
	slug = strings.Trim(slug, "-")

	var sb strings.Builder
	for _, r := range slug {
		if r == '-' || unicode.IsLetter(r) || unicode.IsDigit(r) {
			sb.WriteRune(r)
		}
	}
	slug = sb.String()

	if slug == "" {
		slug = fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return slug
}

// ── Mapper ─────────────────────────────────────────────────────────────────

func mapToDto(a models.Article) dto.ArticleDto {
	tags := make([]dto.TagDto, len(a.Tags))
	for i, t := range a.Tags {
		tags[i] = dto.TagDto{ID: t.ID, Name: t.Name, Slug: t.Slug}
	}

	var cat *dto.CategoryDto
	if a.Category != nil {
		cat = &dto.CategoryDto{
			ID:        a.Category.ID,
			Name:      a.Category.Name,
			Slug:      a.Category.Slug,
			ParentID:  a.Category.ParentID,
			SortOrder: a.Category.SortOrder,
		}
	}

	return dto.ArticleDto{
		ID:          a.ID,
		Title:       a.Title,
		Slug:        a.Slug,
		Summary:     a.Summary,
		Content:     a.Content,
		CoverImage:  a.CoverImage,
		CategoryID:  a.CategoryID,
		Category:    cat,
		AuthorID:    a.AuthorID,
		Author:      mapToUserDto(&a.Author),
		Status:      a.Status,
		PublishedAt: a.PublishedAt,
		ViewCount:   a.ViewCount,
		Tags:        tags,
		CreatedAt:   a.CreatedAt,
		UpdatedAt:   a.UpdatedAt,
	}
}

func mapToListItemDto(a models.Article) dto.ArticleListItemDto {
	tags := make([]dto.TagDto, len(a.Tags))
	for i, t := range a.Tags {
		tags[i] = dto.TagDto{ID: t.ID, Name: t.Name, Slug: t.Slug}
	}

	var cat *dto.CategoryDto
	if a.Category != nil {
		cat = &dto.CategoryDto{
			ID:        a.Category.ID,
			Name:      a.Category.Name,
			Slug:      a.Category.Slug,
			ParentID:  a.Category.ParentID,
			SortOrder: a.Category.SortOrder,
		}
	}

	return dto.ArticleListItemDto{
		ID:          a.ID,
		Title:       a.Title,
		Slug:        a.Slug,
		Summary:     a.Summary,
		CoverImage:  a.CoverImage,
		Category:    cat,
		Author:      mapToUserDto(&a.Author),
		Status:      a.Status,
		PublishedAt: a.PublishedAt,
		ViewCount:   a.ViewCount,
		Tags:        tags,
		CreatedAt:   a.CreatedAt,
	}
}
