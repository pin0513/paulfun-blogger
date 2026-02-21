package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/paulhuang/paulfun-blogger/internal/dto"
	"github.com/paulhuang/paulfun-blogger/internal/services"
)

type MediaHandler struct {
	svc *services.MediaService
}

func NewMediaHandler(svc *services.MediaService) *MediaHandler {
	return &MediaHandler{svc: svc}
}

// GET /api/admin/media
func (h *MediaHandler) ListMedia(c *gin.Context) {
	var q dto.MediaQueryParams
	if err := c.ShouldBindQuery(&q); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("查詢參數錯誤"))
		return
	}

	resp, err := h.svc.GetMedia(q)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail[any]("查詢失敗"))
		return
	}

	c.JSON(http.StatusOK, dto.Ok(resp, ""))
}

// GET /api/admin/media/:id
func (h *MediaHandler) GetMedia(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("ID 格式錯誤"))
		return
	}

	media, err := h.svc.GetMediaByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, dto.Fail[any]("檔案不存在"))
		return
	}

	c.JSON(http.StatusOK, dto.Ok(media, ""))
}

// POST /api/admin/media/upload
func (h *MediaHandler) Upload(c *gin.Context) {
	userID, ok := getUserIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, dto.Fail[any]("未登入"))
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("請選擇檔案"))
		return
	}

	resp, err := h.svc.Upload(file, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail[any]("上傳失敗"))
		return
	}

	if !resp.Success {
		c.JSON(http.StatusBadRequest, resp)
		return
	}

	c.JSON(http.StatusOK, resp)
}

// DELETE /api/admin/media/:id
func (h *MediaHandler) Delete(c *gin.Context) {
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

	resp, err := h.svc.Delete(id, userID)
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
