package dto

import "time"

// ── 共用子 DTO ────────────────────────────────────────────────

type CategoryDto struct {
	ID           uint   `json:"id"`
	Name         string `json:"name"`
	Slug         string `json:"slug"`
	ParentID     *uint  `json:"parentId"`
	SortOrder    int    `json:"sortOrder"`
	ArticleCount int    `json:"articleCount,omitempty"`
}

type TagDto struct {
	ID   uint   `json:"id"`
	Name string `json:"name"`
	Slug string `json:"slug"`
}

// ── Article ───────────────────────────────────────────────────

type ArticleDto struct {
	ID          uint         `json:"id"`
	Title       string       `json:"title"`
	Slug        string       `json:"slug"`
	Summary     *string      `json:"summary"`
	Content     *string      `json:"content"`
	CoverImage  *string      `json:"coverImage"`
	CategoryID  *uint        `json:"categoryId"`
	Category    *CategoryDto `json:"category"`
	AuthorID    uint         `json:"authorId"`
	Author      UserDto      `json:"author"`
	Status      string       `json:"status"`
	PublishedAt *time.Time   `json:"publishedAt"`
	ViewCount   int          `json:"viewCount"`
	Tags        []TagDto     `json:"tags"`
	CreatedAt   time.Time    `json:"createdAt"`
	UpdatedAt   *time.Time   `json:"updatedAt"`
}

type ArticleListItemDto struct {
	ID          uint         `json:"id"`
	Title       string       `json:"title"`
	Slug        string       `json:"slug"`
	Summary     *string      `json:"summary"`
	CoverImage  *string      `json:"coverImage"`
	Category    *CategoryDto `json:"category"`
	Author      UserDto      `json:"author"`
	Status      string       `json:"status"`
	PublishedAt *time.Time   `json:"publishedAt"`
	ViewCount   int          `json:"viewCount"`
	Tags        []TagDto     `json:"tags"`
	CreatedAt   time.Time    `json:"createdAt"`
}

// ── Request ───────────────────────────────────────────────────

type CreateArticleRequest struct {
	Title      string  `json:"title" binding:"required"`
	Summary    *string `json:"summary"`
	Content    *string `json:"content"`
	CoverImage *string `json:"coverImage"`
	CategoryID *uint   `json:"categoryId"`
	TagIDs     []uint  `json:"tagIds"`
}

type UpdateArticleRequest struct {
	Title      string  `json:"title" binding:"required"`
	Summary    *string `json:"summary"`
	Content    *string `json:"content"`
	CoverImage *string `json:"coverImage"`
	CategoryID *uint   `json:"categoryId"`
	TagIDs     []uint  `json:"tagIds"`
}

type PublishArticleRequest struct {
	ScheduledAt *time.Time `json:"scheduledAt"`
}

// ── Query ─────────────────────────────────────────────────────

type ArticleQueryParams struct {
	Page       int    `form:"page"`
	PageSize   int    `form:"pageSize"`
	SortBy     string `form:"sortBy"`
	Descending bool   `form:"descending"`
	CategoryID *uint  `form:"categoryId"`
	TagID      *uint  `form:"tagId"`
	Search     string `form:"search"`
	Status     string `form:"status"`
}

func (q *ArticleQueryParams) GetPage() int {
	if q.Page < 1 {
		return 1
	}
	return q.Page
}

func (q *ArticleQueryParams) GetPageSize() int {
	if q.PageSize < 1 || q.PageSize > 100 {
		return 10
	}
	return q.PageSize
}

func (q *ArticleQueryParams) GetSortBy() string {
	if q.SortBy == "" {
		return "createdAt"
	}
	return q.SortBy
}
