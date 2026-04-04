package handlers

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/paulhuang/paulfun-blogger/internal/dto"
	"github.com/paulhuang/paulfun-blogger/internal/services"
)

// AdminHandler 處理後台文章 CRUD API（需 JWT 認證）。
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
		handleErr(c, err, "查詢失敗")
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

	article, err := h.articleSvc.CreateArticle(req, userID)
	if err != nil {
		handleErr(c, err, "建立失敗")
		return
	}

	c.JSON(http.StatusCreated, dto.Ok(article, "文章建立成功"))
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

	article, err := h.articleSvc.UpdateArticle(id, req, userID)
	if err != nil {
		handleErr(c, err, "更新失敗")
		return
	}

	c.JSON(http.StatusOK, dto.Ok(article, "文章更新成功"))
}

// PATCH /api/admin/articles/:id — 局部更新（只更新有傳送的欄位）
func (h *AdminHandler) PatchArticle(c *gin.Context) {
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

	// 讀取 raw body，用 map 判斷哪些欄位有傳送
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("讀取請求失敗"))
		return
	}

	var rawFields map[string]json.RawMessage
	if err := json.Unmarshal(body, &rawFields); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("JSON 格式錯誤"))
		return
	}

	var req dto.PatchArticleRequest
	if err := json.Unmarshal(body, &req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("請求格式錯誤: "+err.Error()))
		return
	}

	// 建立 fields mask：只有 JSON 中有出現的 key 才算「有傳送」
	_, hasTitle := rawFields["title"]
	_, hasSummary := rawFields["summary"]
	_, hasContent := rawFields["content"]
	_, hasCoverImage := rawFields["coverImage"]
	_, hasCategoryID := rawFields["categoryId"]
	_, hasTagIDs := rawFields["tagIds"]

	fields := dto.PatchArticleFields{
		HasTitle:      hasTitle,
		HasSummary:    hasSummary,
		HasContent:    hasContent,
		HasCoverImage: hasCoverImage,
		HasCategoryID: hasCategoryID,
		HasTagIDs:     hasTagIDs,
	}

	article, err := h.articleSvc.PatchArticle(id, req, fields, userID)
	if err != nil {
		handleErr(c, err, "更新失敗")
		return
	}

	c.JSON(http.StatusOK, dto.Ok(article, "文章更新成功"))
}

// GET /api/admin/articles/:id/archives — 取得文章歷史版本列表
func (h *AdminHandler) GetArticleArchives(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("ID 格式錯誤"))
		return
	}

	archives, err := h.articleSvc.GetArticleArchives(id)
	if err != nil {
		handleErr(c, err, "查詢失敗")
		return
	}

	c.JSON(http.StatusOK, dto.Ok(archives, ""))
}

// GET /api/admin/articles/:id/archives/:archiveId — 取得歷史版本完整內容
func (h *AdminHandler) GetArticleArchiveDetail(c *gin.Context) {
	archiveID, err := parseUintParam(c, "archiveId")
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("archiveId 格式錯誤"))
		return
	}

	detail, err := h.articleSvc.GetArticleArchiveDetail(archiveID)
	if err != nil {
		handleErr(c, err, "查詢失敗")
		return
	}

	c.JSON(http.StatusOK, dto.Ok(detail, ""))
}

// POST /api/admin/articles/:id/restore/:archiveId — 從歷史版本還原
func (h *AdminHandler) RestoreArticle(c *gin.Context) {
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

	archiveID, err := parseUintParam(c, "archiveId")
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("archiveId 格式錯誤"))
		return
	}

	article, err := h.articleSvc.RestoreArticle(id, archiveID, userID)
	if err != nil {
		handleErr(c, err, "還原失敗")
		return
	}

	c.JSON(http.StatusOK, dto.Ok(article, "文章已還原"))
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

	if err := h.articleSvc.DeleteArticle(id, userID); err != nil {
		handleErr(c, err, "刪除失敗")
		return
	}

	c.JSON(http.StatusOK, dto.Ok(true, "文章刪除成功"))
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
	_ = c.ShouldBindJSON(&req) // 選填（排程發佈時才有 body）

	article, err := h.articleSvc.PublishArticle(id, &req, userID)
	if err != nil {
		handleErr(c, err, "發佈失敗")
		return
	}

	c.JSON(http.StatusOK, dto.Ok(article, "文章發佈成功"))
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

	article, err := h.articleSvc.UnpublishArticle(id, userID)
	if err != nil {
		handleErr(c, err, "操作失敗")
		return
	}

	c.JSON(http.StatusOK, dto.Ok(article, "文章已取消發佈"))
}
