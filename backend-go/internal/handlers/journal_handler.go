package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/paulhuang/paulfun-blogger/internal/dto"
	"github.com/paulhuang/paulfun-blogger/internal/middleware"
	"github.com/paulhuang/paulfun-blogger/internal/services"
)

// JournalHandler 自我覺察日記（私人）。
type JournalHandler struct {
	svc *services.JournalService
}

func NewJournalHandler(svc *services.JournalService) *JournalHandler {
	return &JournalHandler{svc: svc}
}

// owner 取出登入者 ID，並拒絕 SAT-issued token。
//
// 為什麼擋 SAT：service account token 是給 CI / script 用的，會出現在
// 環境變數與 log 裡，外流風險比人類密碼高。日記是私人內容，
// 不該被一個「拿來自動發文」的憑證讀到。回 true 代表已經寫過 response。
func (h *JournalHandler) owner(c *gin.Context) (uint, bool) {
	raw, ok := c.Get("claims")
	if !ok {
		c.AbortWithStatusJSON(http.StatusUnauthorized, dto.Fail[any]("未登入"))
		return 0, false
	}
	cl, ok := raw.(*middleware.Claims)
	if !ok {
		c.AbortWithStatusJSON(http.StatusUnauthorized, dto.Fail[any]("Token 格式錯誤"))
		return 0, false
	}
	if cl.SatID != 0 {
		c.AbortWithStatusJSON(http.StatusForbidden,
			dto.Fail[any]("service account token 不可存取私人日記"))
		return 0, false
	}
	uid, ok := getUserIDFromContext(c)
	if !ok {
		c.AbortWithStatusJSON(http.StatusUnauthorized, dto.Fail[any]("無法識別使用者"))
		return 0, false
	}
	return uid, true
}

// GET /api/admin/journal
func (h *JournalHandler) List(c *gin.Context) {
	uid, ok := h.owner(c)
	if !ok {
		return
	}
	var q dto.JournalQueryParams
	if err := c.ShouldBindQuery(&q); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("查詢參數錯誤"))
		return
	}
	resp, err := h.svc.List(uid, q)
	if err != nil {
		handleErr(c, err, "查詢失敗")
		return
	}
	c.JSON(http.StatusOK, dto.Ok(resp, ""))
}

// GET /api/admin/journal/stats
func (h *JournalHandler) Stats(c *gin.Context) {
	uid, ok := h.owner(c)
	if !ok {
		return
	}
	s, err := h.svc.Stats(uid)
	if err != nil {
		handleErr(c, err, "查詢失敗")
		return
	}
	c.JSON(http.StatusOK, dto.Ok(s, ""))
}

// GET /api/admin/journal/:id
func (h *JournalHandler) Get(c *gin.Context) {
	uid, ok := h.owner(c)
	if !ok {
		return
	}
	id, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("ID 格式錯誤"))
		return
	}
	e, err := h.svc.Get(uid, id)
	if err != nil {
		handleErr(c, err, "查詢失敗")
		return
	}
	c.JSON(http.StatusOK, dto.Ok(e, ""))
}

// POST /api/admin/journal
func (h *JournalHandler) Create(c *gin.Context) {
	uid, ok := h.owner(c)
	if !ok {
		return
	}
	var req dto.UpsertJournalEntryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("請求格式錯誤"))
		return
	}
	e, err := h.svc.Create(uid, &req)
	if err != nil {
		handleErr(c, err, "建立失敗")
		return
	}
	c.JSON(http.StatusCreated, dto.Ok(e, "已記錄"))
}

// PUT /api/admin/journal/:id
func (h *JournalHandler) Update(c *gin.Context) {
	uid, ok := h.owner(c)
	if !ok {
		return
	}
	id, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("ID 格式錯誤"))
		return
	}
	var req dto.UpsertJournalEntryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("請求格式錯誤"))
		return
	}
	e, err := h.svc.Update(uid, id, &req)
	if err != nil {
		handleErr(c, err, "更新失敗")
		return
	}
	c.JSON(http.StatusOK, dto.Ok(e, "已更新"))
}

// DELETE /api/admin/journal/:id
func (h *JournalHandler) Delete(c *gin.Context) {
	uid, ok := h.owner(c)
	if !ok {
		return
	}
	id, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("ID 格式錯誤"))
		return
	}
	if err := h.svc.Delete(uid, id); err != nil {
		handleErr(c, err, "刪除失敗")
		return
	}
	c.JSON(http.StatusOK, dto.Ok[any](nil, "已刪除"))
}
