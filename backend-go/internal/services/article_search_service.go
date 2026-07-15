package services

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/paulhuang/paulfun-blogger/internal/apierror"
	"github.com/paulhuang/paulfun-blogger/internal/dto"
	"github.com/paulhuang/paulfun-blogger/internal/models"
)

var htmlTagRe = regexp.MustCompile(`<[^>]*>`)

// SearchArticles 多條件全文檢索（後台回顧用，含草稿）。
// 契約見 docs/specs/2026-07-15-article-review-search-links.md：
// Pre: q 至少 1 個詞；Post: 每筆結果必然滿足 mode 邏輯；唯讀。
func (s *ArticleService) SearchArticles(p dto.ArticleSearchParams) (dto.PagedResponse[dto.ArticleSearchItemDto], error) {
	empty := dto.PagedResponse[dto.ArticleSearchItemDto]{}

	keywords := strings.Fields(strings.TrimSpace(p.Q))
	if len(keywords) == 0 {
		return empty, fmt.Errorf("%w: 缺少檢索關鍵字 q", apierror.ErrBadRequest)
	}
	if len(keywords) > 10 {
		keywords = keywords[:10] // 防濫用
	}

	fields := parseSearchFields(p.Fields)
	mode := strings.ToLower(p.Mode)
	if mode != "or" {
		mode = "and"
	}

	query := s.db.Model(&models.Article{}).
		Preload("Author").
		Preload("Category").
		Preload("Tags")

	// 每個關鍵字產生一組跨欄位 OR 條件；關鍵字之間依 mode 用 AND / OR 串接
	var kwConds []string
	var kwArgs []interface{}
	for _, kw := range keywords {
		like := "%" + strings.ToLower(kw) + "%"
		var fieldConds []string
		for _, f := range fields {
			fieldConds = append(fieldConds, fmt.Sprintf("LOWER(COALESCE(%s, '')) LIKE ?", f))
			kwArgs = append(kwArgs, like)
		}
		kwConds = append(kwConds, "("+strings.Join(fieldConds, " OR ")+")")
	}
	joiner := " AND "
	if mode == "or" {
		joiner = " OR "
	}
	query = query.Where(strings.Join(kwConds, joiner), kwArgs...)

	if p.Status != "" {
		query = query.Where("status = ?", p.Status)
	}
	if ids := parseCSVUints(p.CategoryIDs); len(ids) > 0 {
		query = query.Where("category_id IN ?", ids)
	}
	if ids := parseCSVUints(p.TagIDs); len(ids) > 0 {
		query = query.Joins("JOIN article_tags ON article_tags.article_id = articles.id").
			Where("article_tags.tag_id IN ?", ids).
			Distinct("articles.*")
	}

	dateCol := "created_at"
	if strings.ToLower(p.DateField) == "published" {
		dateCol = "published_at"
	}
	if p.DateFrom != "" {
		if t, err := time.Parse("2006-01-02", p.DateFrom); err == nil {
			query = query.Where(dateCol+" >= ?", t)
		}
	}
	if p.DateTo != "" {
		if t, err := time.Parse("2006-01-02", p.DateTo); err == nil {
			query = query.Where(dateCol+" < ?", t.AddDate(0, 0, 1)) // 含當天
		}
	}

	var totalCount int64
	if err := query.Count(&totalCount).Error; err != nil {
		return empty, err
	}

	sortBy := strings.ToLower(p.SortBy)
	dir := "DESC"
	if p.Descending != nil && !*p.Descending {
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

	page := p.Page
	if page < 1 {
		page = 1
	}
	pageSize := p.PageSize
	if pageSize < 1 {
		pageSize = 10
	}
	if pageSize > 100 {
		pageSize = 100
	}

	var articles []models.Article
	if err := query.Offset((page - 1) * pageSize).Limit(pageSize).Find(&articles).Error; err != nil {
		return empty, err
	}

	items := make([]dto.ArticleSearchItemDto, len(articles))
	for i, a := range articles {
		items[i] = dto.ArticleSearchItemDto{
			ArticleListItemDto: mapToListItemDto(a),
			Snippet:            buildSnippet(a, keywords),
			MatchedFields:      matchedFields(a, keywords),
		}
	}

	totalPages := (int(totalCount) + pageSize - 1) / pageSize
	if totalPages == 0 {
		totalPages = 1
	}
	return dto.PagedResponse[dto.ArticleSearchItemDto]{
		Items:           items,
		TotalCount:      int(totalCount),
		Page:            page,
		PageSize:        pageSize,
		TotalPages:      totalPages,
		HasPreviousPage: page > 1,
		HasNextPage:     page < totalPages,
	}, nil
}

// parseSearchFields 解析欄位限定，僅接受白名單欄位（防注入）。
func parseSearchFields(raw string) []string {
	allowed := map[string]bool{"title": true, "summary": true, "content": true}
	var fields []string
	for _, f := range strings.Split(raw, ",") {
		f = strings.TrimSpace(strings.ToLower(f))
		if allowed[f] {
			fields = append(fields, f)
		}
	}
	if len(fields) == 0 {
		return []string{"title", "summary", "content"}
	}
	return fields
}

func parseCSVUints(raw string) []uint {
	var ids []uint
	for _, part := range strings.Split(raw, ",") {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		var id uint
		if _, err := fmt.Sscanf(part, "%d", &id); err == nil && id > 0 {
			ids = append(ids, id)
		}
	}
	return ids
}

// buildSnippet 取 content（去 HTML）第一個命中詞前後各 60 字；
// content 未命中則退回 summary 或 content 開頭。命中詞以【】標記。
func buildSnippet(a models.Article, keywords []string) string {
	plain := ""
	if a.Content != nil {
		plain = htmlTagRe.ReplaceAllString(*a.Content, " ")
		plain = strings.Join(strings.Fields(plain), " ")
	}

	runes := []rune(plain)
	lower := strings.ToLower(plain)
	for _, kw := range keywords {
		idx := strings.Index(lower, strings.ToLower(kw))
		if idx < 0 {
			continue
		}
		// byte index → rune index
		runeIdx := len([]rune(plain[:idx]))
		kwLen := len([]rune(kw))
		start := runeIdx - 60
		if start < 0 {
			start = 0
		}
		end := runeIdx + kwLen + 60
		if end > len(runes) {
			end = len(runes)
		}
		snippet := string(runes[start:runeIdx]) + "【" + string(runes[runeIdx:runeIdx+kwLen]) + "】" + string(runes[runeIdx+kwLen:end])
		if start > 0 {
			snippet = "…" + snippet
		}
		if end < len(runes) {
			snippet += "…"
		}
		return snippet
	}

	// content 沒命中：退 summary，再退 content 開頭
	if a.Summary != nil && *a.Summary != "" {
		return truncateRunes(*a.Summary, 120)
	}
	return truncateRunes(plain, 120)
}

func truncateRunes(s string, n int) string {
	runes := []rune(s)
	if len(runes) <= n {
		return s
	}
	return string(runes[:n]) + "…"
}

// matchedFields 回報每個欄位是否至少命中一個關鍵字。
func matchedFields(a models.Article, keywords []string) []string {
	var out []string
	check := func(name, val string) {
		lv := strings.ToLower(val)
		for _, kw := range keywords {
			if strings.Contains(lv, strings.ToLower(kw)) {
				out = append(out, name)
				return
			}
		}
	}
	check("title", a.Title)
	if a.Summary != nil {
		check("summary", *a.Summary)
	}
	if a.Content != nil {
		check("content", *a.Content)
	}
	if out == nil {
		out = []string{}
	}
	return out
}
