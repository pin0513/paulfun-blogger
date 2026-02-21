package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/paulhuang/paulfun-blogger/internal/dto"
	"github.com/paulhuang/paulfun-blogger/internal/services"
)

type AdminHandler struct {
	articleSvc *services.ArticleService
}

func NewAdminHandler(articleSvc *services.ArticleService) *AdminHandler {
	return &AdminHandler{articleSvc: articleSvc}
}

// GET /api/admin/articles
func (h *AdminHandler) ListArticles(c *gin.Context) {
	var q dto.ArticleQueryParams
	if err := c.ShouldBindQuery(&q); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("查詢參數錯誤"))
		return
	}

	resp, err := h.articleSvc.GetArticles(q, true)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail[any]("查詢失敗"))
		return
	}

	c.JSON(http.StatusOK, dto.Ok(resp, ""))
}

// GET /api/admin/articles/:id
func (h *AdminHandler) GetArticle(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("ID 格式錯誤"))
		return
	}

	article, err := h.articleSvc.GetArticleByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, dto.Fail[any]("文章不存在"))
		return
	}

	c.JSON(http.StatusOK, dto.Ok(article, ""))
}

// POST /api/admin/articles
func (h *AdminHandler) CreateArticle(c *gin.Context) {
	userID, ok := getUserIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, dto.Fail[any]("未登入"))
		return
	}

	var req dto.CreateArticleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("請求格式錯誤: "+err.Error()))
		return
	}

	resp, err := h.articleSvc.CreateArticle(req, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail[any]("建立失敗"))
		return
	}

	c.JSON(http.StatusCreated, resp)
}

// PUT /api/admin/articles/:id
func (h *AdminHandler) UpdateArticle(c *gin.Context) {
	userID, ok := getUserIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, dto.Fail[any]("未登入"))
		return
	}

	id, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("ID 格式錯誤"))
		return
	}

	var req dto.UpdateArticleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("請求格式錯誤: "+err.Error()))
		return
	}

	resp, err := h.articleSvc.UpdateArticle(id, req, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail[any]("更新失敗"))
		return
	}

	if !resp.Success {
		c.JSON(http.StatusForbidden, resp)
		return
	}

	c.JSON(http.StatusOK, resp)
}

// DELETE /api/admin/articles/:id
func (h *AdminHandler) DeleteArticle(c *gin.Context) {
	userID, ok := getUserIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, dto.Fail[any]("未登入"))
		return
	}

	id, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("ID 格式錯誤"))
		return
	}

	resp, err := h.articleSvc.DeleteArticle(id, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail[any]("刪除失敗"))
		return
	}

	if !resp.Success {
		c.JSON(http.StatusForbidden, resp)
		return
	}

	c.JSON(http.StatusOK, resp)
}

// POST /api/admin/articles/:id/publish
func (h *AdminHandler) PublishArticle(c *gin.Context) {
	userID, ok := getUserIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, dto.Fail[any]("未登入"))
		return
	}

	id, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("ID 格式錯誤"))
		return
	}

	var req dto.PublishArticleRequest
	_ = c.ShouldBindJSON(&req)

	resp, err := h.articleSvc.PublishArticle(id, &req, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail[any]("發佈失敗"))
		return
	}

	if !resp.Success {
		c.JSON(http.StatusForbidden, resp)
		return
	}

	c.JSON(http.StatusOK, resp)
}

// POST /api/admin/articles/:id/unpublish
func (h *AdminHandler) UnpublishArticle(c *gin.Context) {
	userID, ok := getUserIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, dto.Fail[any]("未登入"))
		return
	}

	id, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("ID 格式錯誤"))
		return
	}

	resp, err := h.articleSvc.UnpublishArticle(id, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail[any]("操作失敗"))
		return
	}

	if !resp.Success {
		c.JSON(http.StatusForbidden, resp)
		return
	}

	c.JSON(http.StatusOK, resp)
}

// ── helper ────────────────────────────────────────────────────────────────

func parseUintParam(c *gin.Context, key string) (uint, error) {
	val, err := strconv.ParseUint(c.Param(key), 10, 64)
	if err != nil {
		return 0, err
	}
	return uint(val), nil
}
