package dto

import "time"

// ── 批量匯入 Request ───────────────────────────────────────────

// ImportCategoryItem 單筆分類匯入項目
type ImportCategoryItem struct {
	Name      string `json:"name" binding:"required"`
	Slug      string `json:"slug"`
	SortOrder int    `json:"sortOrder"`
}

// ImportCategoriesRequest 批量匯入分類
type ImportCategoriesRequest struct {
	Categories []ImportCategoryItem `json:"categories" binding:"required,min=1"`
}

// ImportTagItem 單筆標籤匯入項目
type ImportTagItem struct {
	Name string `json:"name" binding:"required"`
	Slug string `json:"slug"`
}

// ImportTagsRequest 批量匯入標籤
type ImportTagsRequest struct {
	Tags []ImportTagItem `json:"tags" binding:"required,min=1"`
}

// ImportArticleItem 單筆文章匯入項目
type ImportArticleItem struct {
	Title        string     `json:"title" binding:"required"`
	Slug         string     `json:"slug"`
	Summary      *string    `json:"summary"`
	Content      *string    `json:"content"`
	CoverImage   *string    `json:"coverImage"`
	CategorySlug string     `json:"categorySlug"`  // 用 slug 對應，沒有則略過
	TagSlugs     []string   `json:"tagSlugs"`      // 用 slug 對應
	Publish      bool       `json:"publish"`       // true = 匯入後立即發佈
	PublishedAt  *time.Time `json:"publishedAt"`   // 指定發佈時間（Publish=true 時有效）
}

// ImportArticlesRequest 批量匯入文章
type ImportArticlesRequest struct {
	Articles []ImportArticleItem `json:"articles" binding:"required,min=1"`
	Update   bool                `json:"update"` // true = slug 已存在時更新 content（預設跳過）
}

// ── 批量匯入 Response ──────────────────────────────────────────

type ImportCategoryResult struct {
	Name    string `json:"name"`
	Slug    string `json:"slug"`
	ID      uint   `json:"id"`
	Created bool   `json:"created"` // true=新建 / false=已存在（跳過）
}

type ImportTagResult struct {
	Name    string `json:"name"`
	Slug    string `json:"slug"`
	ID      uint   `json:"id"`
	Created bool   `json:"created"`
}

type ImportArticleResult struct {
	Title   string `json:"title"`
	Slug    string `json:"slug"`
	ID      uint   `json:"id"`
	Created bool   `json:"created"`
	Error   string `json:"error,omitempty"`
}

type ImportCategoriesResponse struct {
	Created int                    `json:"created"`
	Skipped int                    `json:"skipped"`
	Items   []ImportCategoryResult `json:"items"`
}

type ImportTagsResponse struct {
	Created int               `json:"created"`
	Skipped int               `json:"skipped"`
	Items   []ImportTagResult `json:"items"`
}

type ImportArticlesResponse struct {
	Created int                   `json:"created"`
	Skipped int                   `json:"skipped"`
	Failed  int                   `json:"failed"`
	Items   []ImportArticleResult `json:"items"`
}
