package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/paulhuang/paulfun-blogger/internal/dto"
	"github.com/paulhuang/paulfun-blogger/internal/services"
)

// ImportHandler 提供後台批量匯入 API（需 JWT 認證）。
type ImportHandler struct {
	importSvc *services.ImportService
}

func NewImportHandler(importSvc *services.ImportService) *ImportHandler {
	return &ImportHandler{importSvc: importSvc}
}

// POST /api/admin/import/categories
func (h *ImportHandler) ImportCategories(c *gin.Context) {
	var req dto.ImportCategoriesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("請求格式錯誤: "+err.Error()))
		return
	}

	resp, err := h.importSvc.ImportCategories(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail[any]("匯入失敗: "+err.Error()))
		return
	}

	c.JSON(http.StatusOK, dto.Ok(resp, ""))
}

// POST /api/admin/import/tags
func (h *ImportHandler) ImportTags(c *gin.Context) {
	var req dto.ImportTagsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("請求格式錯誤: "+err.Error()))
		return
	}

	resp, err := h.importSvc.ImportTags(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail[any]("匯入失敗: "+err.Error()))
		return
	}

	c.JSON(http.StatusOK, dto.Ok(resp, ""))
}

// POST /api/admin/import/articles
func (h *ImportHandler) ImportArticles(c *gin.Context) {
	userID, ok := getUserIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, dto.Fail[any]("未登入"))
		return
	}

	var req dto.ImportArticlesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("請求格式錯誤: "+err.Error()))
		return
	}

	resp, err := h.importSvc.ImportArticles(req, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail[any]("匯入失敗: "+err.Error()))
		return
	}

	c.JSON(http.StatusOK, dto.Ok(resp, ""))
}
