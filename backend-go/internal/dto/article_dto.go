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

// PatchArticleRequest 支援單一欄位更新。
// 搭配 PatchArticleFields 使用，透過 json.RawMessage 判斷哪些欄位有傳送。
type PatchArticleRequest struct {
	Title      *string `json:"title"`
	Summary    *string `json:"summary"`
	Content    *string `json:"content"`
	CoverImage *string `json:"coverImage"`
	CategoryID *uint   `json:"categoryId"`
	TagIDs     []uint  `json:"tagIds"`
}

// PatchArticleFields 記錄哪些欄位在 JSON 中有明確傳送（包含 null）。
type PatchArticleFields struct {
	HasTitle      bool
	HasSummary    bool
	HasContent    bool
	HasCoverImage bool
	HasCategoryID bool
	HasTagIDs     bool
}

// ArticleArchiveDto 文章歷史版本摘要。
type ArticleArchiveDto struct {
	ID         uint      `json:"id"`
	ArticleID  uint      `json:"articleId"`
	Title      string    `json:"title"`
	Version    int       `json:"version"`
	ArchivedAt time.Time `json:"archivedAt"`
	ArchivedBy uint      `json:"archivedBy"`
}

// ArticleArchiveDetailDto 文章歷史版本完整內容。
type ArticleArchiveDetailDto struct {
	ID         uint      `json:"id"`
	ArticleID  uint      `json:"articleId"`
	Title      string    `json:"title"`
	Slug       string    `json:"slug"`
	Summary    *string   `json:"summary"`
	Content    *string   `json:"content"`
	CoverImage *string   `json:"coverImage"`
	CategoryID *uint     `json:"categoryId"`
	Status     string    `json:"status"`
	Version    int       `json:"version"`
	TagIDs     string    `json:"tagIds"`
	ArchivedAt time.Time `json:"archivedAt"`
	ArchivedBy uint      `json:"archivedBy"`
}

type PublishArticleRequest struct {
	ScheduledAt *time.Time `json:"scheduledAt"`
}

// ── Query ─────────────────────────────────────────────────────

type ArticleQueryParams struct {
	Page       int    `form:"page"`
	PageSize   int    `form:"pageSize"`
	SortBy     string `form:"sortBy"`
	// Descending 用 *bool 才能區分「沒傳」(nil) 與「明確傳 false」。
	// 沒傳時透過 GetDescending() 預設 true（符合 CLAUDE.md 文件）。
	Descending *bool  `form:"descending"`
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

// GetDescending 預設 true；只有當呼叫端明確傳 descending=false 才回傳 false。
func (q *ArticleQueryParams) GetDescending() bool {
	if q.Descending == nil {
		return true
	}
	return *q.Descending
}
