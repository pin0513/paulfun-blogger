package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/paulhuang/paulfun-blogger/internal/dto"
	"github.com/paulhuang/paulfun-blogger/internal/services"
)

// ArticleHandler 處理前台公開文章 API。
type ArticleHandler struct {
	svc *services.ArticleService
}

func NewArticleHandler(svc *services.ArticleService) *ArticleHandler {
	return &ArticleHandler{svc: svc}
}

// GET /api/articles
func (h *ArticleHandler) ListArticles(c *gin.Context) {
	var q dto.ArticleQueryParams
	if err := c.ShouldBindQuery(&q); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("查詢參數錯誤"))
		return
	}

	resp, err := h.svc.GetArticles(q, false)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail[any]("查詢失敗"))
		return
	}

	c.JSON(http.StatusOK, dto.Ok(resp, ""))
}

// GET /api/articles/categories
func (h *ArticleHandler) ListCategories(c *gin.Context) {
	cats, err := h.svc.GetCategories()
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail[any]("查詢失敗"))
		return
	}
	c.JSON(http.StatusOK, dto.Ok(cats, ""))
}

// GET /api/articles/tags
func (h *ArticleHandler) ListTags(c *gin.Context) {
	tags, err := h.svc.GetTags()
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail[any]("查詢失敗"))
		return
	}
	c.JSON(http.StatusOK, dto.Ok(tags, ""))
}

// GET /api/articles/:id
func (h *ArticleHandler) GetArticleByID(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("無效的文章 ID"))
		return
	}

	article, err := h.svc.GetPublishedArticleByID(id)
	if err != nil {
		handleErr(c, err, "文章不存在")
		return
	}

	// 非同步增加瀏覽數
	go h.svc.IncrementViewCount(article.ID)

	c.JSON(http.StatusOK, dto.Ok(article, ""))
}
