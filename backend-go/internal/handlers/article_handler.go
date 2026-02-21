package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/paulhuang/paulfun-blogger/internal/dto"
	"github.com/paulhuang/paulfun-blogger/internal/services"
)

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

// GET /api/categories
func (h *ArticleHandler) ListCategories(c *gin.Context) {
	cats, err := h.svc.GetCategories()
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail[any]("查詢失敗"))
		return
	}
	c.JSON(http.StatusOK, dto.Ok(cats, ""))
}

// GET /api/tags
func (h *ArticleHandler) ListTags(c *gin.Context) {
	tags, err := h.svc.GetTags()
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail[any]("查詢失敗"))
		return
	}
	c.JSON(http.StatusOK, dto.Ok(tags, ""))
}

// GET /api/:slug
func (h *ArticleHandler) GetArticleBySlug(c *gin.Context) {
	slug := c.Param("slug")

	article, err := h.svc.GetArticleBySlug(slug)
	if err != nil {
		c.JSON(http.StatusNotFound, dto.Fail[any]("文章不存在"))
		return
	}

	// 非同步增加瀏覽數
	go h.svc.IncrementViewCount(article.ID)

	c.JSON(http.StatusOK, dto.Ok(article, ""))
}

// ── 共用 helper ────────────────────────────────────────────────────────────

func getUserIDFromContext(c *gin.Context) (uint, bool) {
	rawID, exists := c.Get("userID")
	if !exists {
		return 0, false
	}
	idStr, ok := rawID.(string)
	if !ok {
		return 0, false
	}
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		return 0, false
	}
	return uint(id), true
}
