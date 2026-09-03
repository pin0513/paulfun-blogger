package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/paulhuang/paulfun-blogger/internal/dto"
	"github.com/paulhuang/paulfun-blogger/internal/markdown"
)

// articleMarkdownSource 是這個端點唯一需要的能力。
//
// 刻意收窄成一個方法的介面，而不是直接吃 *services.ArticleService：
// 這樣 HTTP 契約（狀態碼、Content-Type、內容形狀）就能在沒有資料庫的情況下測。
type articleMarkdownSource interface {
	GetPublishedArticleByID(id uint) (*dto.ArticleDto, error)
}

// MarkdownHandler 提供文章的 AI 可讀 Markdown 版本。
type MarkdownHandler struct {
	src     articleMarkdownSource
	siteURL string
}

func NewMarkdownHandler(src articleMarkdownSource, siteURL string) *MarkdownHandler {
	return &MarkdownHandler{src: src, siteURL: siteURL}
}

// GET /api/articles/:id/markdown
//
// 回純文字 Markdown 而不是 JSON：這個端點的用途是讓 AI agent 直接 fetch
// 就能讀到全文。包一層 JSON 反而讓對方還要先解析、再從欄位裡挖出內容。
func (h *MarkdownHandler) GetArticleMarkdown(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		c.String(http.StatusBadRequest, "無效的文章 ID")
		return
	}

	article, err := h.src.GetPublishedArticleByID(id)
	if err != nil || article == nil {
		c.String(http.StatusNotFound, "文章不存在或尚未發佈")
		return
	}

	c.Header("Content-Type", "text/markdown; charset=utf-8")
	c.String(http.StatusOK, markdown.Render(toMarkdownArticle(article, h.siteURL)))
}

// toMarkdownArticle 把 API 的 DTO 轉成 markdown 套件的輸入。
func toMarkdownArticle(a *dto.ArticleDto, siteURL string) markdown.Article {
	out := markdown.Article{
		ID:          a.ID,
		Title:       a.Title,
		Author:      a.Author.DisplayName,
		PublishedAt: a.PublishedAt,
		Version:     a.Version,
		SiteURL:     siteURL,
	}
	if a.Summary != nil {
		out.Summary = *a.Summary
	}
	if a.Content != nil {
		out.ContentHTML = *a.Content
	}
	if a.Category != nil {
		out.Category = a.Category.Name
	}
	// 比對「當地日期字串」而非 timestamp：發佈當下的微調不算更新，
	// 與前台文章頁顯示「最後更新」的判準保持一致。
	if a.UpdatedAt != nil && a.PublishedAt != nil &&
		a.UpdatedAt.Format("2006-01-02") != a.PublishedAt.Format("2006-01-02") {
		out.UpdatedAt = a.UpdatedAt
	}
	for _, t := range a.Tags {
		out.Tags = append(out.Tags, t.Name)
	}
	return out
}
