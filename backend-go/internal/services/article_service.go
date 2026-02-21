package services

import (
	"fmt"
	"regexp"
	"strings"
	"time"
	"unicode"

	"github.com/paulhuang/paulfun-blogger/internal/dto"
	"github.com/paulhuang/paulfun-blogger/internal/models"
	"gorm.io/gorm"
)

type ArticleService struct {
	db *gorm.DB
}

func NewArticleService(db *gorm.DB) *ArticleService {
	return &ArticleService{db: db}
}

func (s *ArticleService) GetArticles(q dto.ArticleQueryParams, includeUnpublished bool) (dto.PagedResponse[dto.ArticleListItemDto], error) {
	query := s.db.Model(&models.Article{}).
		Preload("Author").
		Preload("Category").
		Preload("Tags")

	// Status filter
	if !includeUnpublished {
		now := time.Now().UTC()
		query = query.Where("status = ? AND published_at <= ?", "published", now)
	} else if q.Status != "" {
		query = query.Where("status = ?", q.Status)
	}

	// CategoryID filter
	if q.CategoryID != nil {
		query = query.Where("category_id = ?", *q.CategoryID)
	}

	// TagID filter（through join table）
	if q.TagID != nil {
		query = query.Joins("JOIN article_tags ON article_tags.article_id = articles.id").
			Where("article_tags.tag_id = ?", *q.TagID)
	}

	// Search
	if q.Search != "" {
		like := "%" + strings.ToLower(q.Search) + "%"
		query = query.Where("LOWER(title) LIKE ? OR LOWER(summary) LIKE ?", like, like)
	}

	var totalCount int64
	if err := query.Count(&totalCount).Error; err != nil {
		return dto.PagedResponse[dto.ArticleListItemDto]{}, err
	}

	// Sorting
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

	return dto.PagedResponse[dto.ArticleListItemDto]{
		Items:      items,
		TotalCount: int(totalCount),
		Page:       page,
		PageSize:   pageSize,
	}, nil
}

func (s *ArticleService) GetArticleByID(id uint) (*dto.ArticleDto, error) {
	var article models.Article
	if err := s.db.Preload("Author").Preload("Category").Preload("Tags").
		First(&article, id).Error; err != nil {
		return nil, err
	}
	d := mapToDto(article)
	return &d, nil
}

func (s *ArticleService) GetArticleBySlug(slug string) (*dto.ArticleDto, error) {
	now := time.Now().UTC()
	var article models.Article
	if err := s.db.Preload("Author").Preload("Category").Preload("Tags").
		Where("slug = ? AND status = ? AND published_at <= ?", slug, "published", now).
		First(&article).Error; err != nil {
		return nil, err
	}
	d := mapToDto(article)
	return &d, nil
}

func (s *ArticleService) CreateArticle(req dto.CreateArticleRequest, authorID uint) (dto.ApiResponse[dto.ArticleDto], error) {
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
		return dto.Fail[dto.ArticleDto]("建立文章失敗"), err
	}

	// Reload with associations
	s.db.Preload("Author").Preload("Category").Preload("Tags").First(&article, article.ID)
	return dto.Ok(mapToDto(article), "文章建立成功"), nil
}

func (s *ArticleService) UpdateArticle(id uint, req dto.UpdateArticleRequest, userID uint) (dto.ApiResponse[dto.ArticleDto], error) {
	var article models.Article
	if err := s.db.Preload("Tags").First(&article, id).Error; err != nil {
		return dto.Fail[dto.ArticleDto]("文章不存在"), nil
	}

	var user models.User
	s.db.First(&user, userID)
	if article.AuthorID != userID && user.Role != "admin" {
		return dto.Fail[dto.ArticleDto]("沒有權限修改此文章"), nil
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
		return dto.Fail[dto.ArticleDto]("更新失敗"), err
	}

	s.db.Preload("Author").Preload("Category").Preload("Tags").First(&article, article.ID)
	return dto.Ok(mapToDto(article), "文章更新成功"), nil
}

func (s *ArticleService) DeleteArticle(id uint, userID uint) (dto.ApiResponse[bool], error) {
	var article models.Article
	if err := s.db.First(&article, id).Error; err != nil {
		return dto.Fail[bool]("文章不存在"), nil
	}

	var user models.User
	s.db.First(&user, userID)
	if article.AuthorID != userID && user.Role != "admin" {
		return dto.Fail[bool]("沒有權限刪除此文章"), nil
	}

	if err := s.db.Delete(&article).Error; err != nil {
		return dto.Fail[bool]("刪除失敗"), err
	}

	return dto.Ok(true, "文章刪除成功"), nil
}

func (s *ArticleService) PublishArticle(id uint, req *dto.PublishArticleRequest, userID uint) (dto.ApiResponse[dto.ArticleDto], error) {
	var article models.Article
	if err := s.db.Preload("Author").Preload("Category").Preload("Tags").First(&article, id).Error; err != nil {
		return dto.Fail[dto.ArticleDto]("文章不存在"), nil
	}

	var user models.User
	s.db.First(&user, userID)
	if article.AuthorID != userID && user.Role != "admin" {
		return dto.Fail[dto.ArticleDto]("沒有權限發佈此文章"), nil
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
		return dto.Fail[dto.ArticleDto]("發佈失敗"), err
	}

	return dto.Ok(mapToDto(article), "文章發佈成功"), nil
}

func (s *ArticleService) UnpublishArticle(id uint, userID uint) (dto.ApiResponse[dto.ArticleDto], error) {
	var article models.Article
	if err := s.db.Preload("Author").Preload("Category").Preload("Tags").First(&article, id).Error; err != nil {
		return dto.Fail[dto.ArticleDto]("文章不存在"), nil
	}

	var user models.User
	s.db.First(&user, userID)
	if article.AuthorID != userID && user.Role != "admin" {
		return dto.Fail[dto.ArticleDto]("沒有權限操作此文章"), nil
	}

	now := time.Now().UTC()
	article.Status = "draft"
	article.PublishedAt = nil
	article.UpdatedAt = &now

	if err := s.db.Save(&article).Error; err != nil {
		return dto.Fail[dto.ArticleDto]("操作失敗"), err
	}

	return dto.Ok(mapToDto(article), "文章已取消發佈"), nil
}

func (s *ArticleService) IncrementViewCount(id uint) {
	s.db.Model(&models.Article{}).Where("id = ?", id).UpdateColumn("view_count", gorm.Expr("view_count + 1"))
}

func (s *ArticleService) GetCategories() ([]dto.CategoryDto, error) {
	var cats []models.Category
	if err := s.db.Order("sort_order ASC").Find(&cats).Error; err != nil {
		return nil, err
	}
	result := make([]dto.CategoryDto, len(cats))
	for i, c := range cats {
		result[i] = dto.CategoryDto{ID: c.ID, Name: c.Name, Slug: c.Slug, ParentID: c.ParentID, SortOrder: c.SortOrder}
	}
	return result, nil
}

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

	// 移除非 ASCII + 非中文字符（保留英數、CJK、連字符）
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
		cat = &dto.CategoryDto{ID: a.Category.ID, Name: a.Category.Name, Slug: a.Category.Slug, ParentID: a.Category.ParentID, SortOrder: a.Category.SortOrder}
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
		cat = &dto.CategoryDto{ID: a.Category.ID, Name: a.Category.Name, Slug: a.Category.Slug, ParentID: a.Category.ParentID, SortOrder: a.Category.SortOrder}
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
