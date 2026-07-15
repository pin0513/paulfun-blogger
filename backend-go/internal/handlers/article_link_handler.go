package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/paulhuang/paulfun-blogger/internal/dto"
	"github.com/paulhuang/paulfun-blogger/internal/services"
)

// ArticleLinkHandler 文章知識串連（admin CRUD + 公開 related）。
type ArticleLinkHandler struct {
	linkSvc *services.ArticleLinkService
}

func NewArticleLinkHandler(linkSvc *services.ArticleLinkService) *ArticleLinkHandler {
	return &ArticleLinkHandler{linkSvc: linkSvc}
}

// GET /api/admin/articles/:id/links
func (h *ArticleLinkHandler) GetLinks(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("ID 格式錯誤"))
		return
	}
	links, err := h.linkSvc.GetLinks(id)
	if err != nil {
		handleErr(c, err, "查詢串連失敗")
		return
	}
	c.JSON(http.StatusOK, dto.Ok(links, ""))
}

// POST /api/admin/articles/:id/links
func (h *ArticleLinkHandler) CreateLink(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("ID 格式錯誤"))
		return
	}
	var req dto.CreateArticleLinkRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("請求格式錯誤"))
		return
	}
	link, err := h.linkSvc.CreateLink(id, &req)
	if err != nil {
		handleErr(c, err, "建立串連失敗")
		return
	}
	c.JSON(http.StatusCreated, dto.Ok(link, "串連建立成功"))
}

// DELETE /api/admin/articles/:id/links/:linkId
func (h *ArticleLinkHandler) DeleteLink(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("ID 格式錯誤"))
		return
	}
	linkID, err := parseUintParam(c, "linkId")
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("linkId 格式錯誤"))
		return
	}
	if err := h.linkSvc.DeleteLink(id, linkID); err != nil {
		handleErr(c, err, "刪除串連失敗")
		return
	}
	c.JSON(http.StatusOK, dto.Ok[any](nil, "串連已刪除"))
}

// GET /api/articles/:id/related（公開）
func (h *ArticleLinkHandler) GetRelated(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("ID 格式錯誤"))
		return
	}
	related, err := h.linkSvc.GetRelated(id)
	if err != nil {
		handleErr(c, err, "查詢相關文章失敗")
		return
	}
	c.JSON(http.StatusOK, dto.Ok(related, ""))
}
