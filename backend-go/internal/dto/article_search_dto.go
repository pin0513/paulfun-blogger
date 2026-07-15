package dto

// ── 回顧檢索（多條件全文檢索）──────────────────────────────
// 設計見 docs/specs/2026-07-15-article-review-search-links.md

type ArticleSearchParams struct {
	Q          string `form:"q"`          // 多關鍵字，空白分隔
	Mode       string `form:"mode"`       // and（預設）| or
	Fields     string `form:"fields"`     // csv: title,summary,content（預設全部）
	Status     string `form:"status"`     // draft | scheduled | published（預設全部）
	CategoryIDs string `form:"categoryIds"` // csv
	TagIDs     string `form:"tagIds"`     // csv
	DateField  string `form:"dateField"`  // created（預設）| published
	DateFrom   string `form:"dateFrom"`   // YYYY-MM-DD
	DateTo     string `form:"dateTo"`     // YYYY-MM-DD
	Page       int    `form:"page"`
	PageSize   int    `form:"pageSize"`
	SortBy     string `form:"sortBy"`
	Descending *bool  `form:"descending"`
}

// ArticleSearchItemDto 檢索結果項：列表欄位 + 回顧輔助欄位。
type ArticleSearchItemDto struct {
	ArticleListItemDto
	Snippet       string   `json:"snippet"`       // 命中前後文，命中詞以【】標記
	MatchedFields []string `json:"matchedFields"` // 命中的欄位
}

// ── 知識串連 ────────────────────────────────────────────

type CreateArticleLinkRequest struct {
	ToArticleID uint    `json:"toArticleId" binding:"required"`
	Relation    string  `json:"relation" binding:"required"` // related | series
	Note        *string `json:"note"`
}

// ArticleLinkDto 後台管理視角的 link（含兩端文章摘要）。
type ArticleLinkDto struct {
	ID        uint             `json:"id"`
	Relation  string           `json:"relation"`
	Note      *string          `json:"note"`
	Direction string           `json:"direction"` // outgoing | incoming（相對於查詢的文章）
	Article   LinkedArticleDto `json:"article"`   // 另一端的文章
}

// LinkedArticleDto 串連文章的精簡資訊。
type LinkedArticleDto struct {
	ID          uint    `json:"id"`
	Title       string  `json:"title"`
	Slug        string  `json:"slug"`
	Status      string  `json:"status"`
	PublishedAt *string `json:"publishedAt"`
}

// SeriesItemDto 公開端系列文章項。
type SeriesItemDto struct {
	ID          uint    `json:"id"`
	Title       string  `json:"title"`
	Slug        string  `json:"slug"`
	PublishedAt *string `json:"publishedAt"`
	Note        *string `json:"note"`
	IsCurrent   bool    `json:"isCurrent"`
}

// RelatedArticlesDto 公開端 GET /api/articles/:id/related 回應。
type RelatedArticlesDto struct {
	Series  []SeriesItemDto  `json:"series"`  // 完整系列鏈，舊 → 新
	Related []SeriesItemDto  `json:"related"` // 相關文章（雙向去重）
}
