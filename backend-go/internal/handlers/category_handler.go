package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/paulhuang/paulfun-blogger/internal/dto"
	"github.com/paulhuang/paulfun-blogger/internal/services"
)

// CategoryHandler 處理後台分類 CRUD API（需 JWT + admin）。
type CategoryHandler struct {
	categorySvc *services.CategoryService
}

func NewCategoryHandler(categorySvc *services.CategoryService) *CategoryHandler {
	return &CategoryHandler{categorySvc: categorySvc}
}

// POST /api/admin/categories
func (h *CategoryHandler) Create(c *gin.Context) {
	var req dto.CreateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("請求格式錯誤: "+err.Error()))
		return
	}
	cat, err := h.categorySvc.Create(req)
	if err != nil {
		handleErr(c, err, "建立失敗")
		return
	}
	c.JSON(http.StatusCreated, dto.Ok(cat, "分類建立成功"))
}

// PUT /api/admin/categories/:id
func (h *CategoryHandler) Update(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("ID 格式錯誤"))
		return
	}
	var req dto.UpdateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("請求格式錯誤: "+err.Error()))
		return
	}
	cat, err := h.categorySvc.Update(id, req)
	if err != nil {
		handleErr(c, err, "更新失敗")
		return
	}
	c.JSON(http.StatusOK, dto.Ok(cat, "分類更新成功"))
}

// DELETE /api/admin/categories/:id
//
// 刪除前會把該分類下的文章 reassign 到「未分類」分類，
// 並把子分類的 parent_id 設為 nil。「未分類」本身不可刪。
func (h *CategoryHandler) Delete(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("ID 格式錯誤"))
		return
	}
	if err := h.categorySvc.Delete(id); err != nil {
		handleErr(c, err, "刪除失敗")
		return
	}
	c.JSON(http.StatusOK, dto.Ok[any](nil, "分類刪除成功"))
}
