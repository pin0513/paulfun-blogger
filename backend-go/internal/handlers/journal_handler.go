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

// GET /api/admin/journal?from=&to=  月曆用，只回填寫概況不回內容
func (h *JournalHandler) Range(c *gin.Context) {
	uid, ok := h.owner(c)
	if !ok {
		return
	}
	var q dto.JournalRangeParams
	if err := c.ShouldBindQuery(&q); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("查詢參數錯誤"))
		return
	}
	days, err := h.svc.GetRange(uid, q.From, q.To)
	if err != nil {
		handleErr(c, err, "查詢失敗")
		return
	}
	c.JSON(http.StatusOK, dto.Ok(days, ""))
}

// GET /api/admin/journal/stats
func (h *JournalHandler) Stats(c *gin.Context) {
	uid, ok := h.owner(c)
	if !ok {
		return
	}
	st, err := h.svc.Stats(uid)
	if err != nil {
		handleErr(c, err, "查詢失敗")
		return
	}
	c.JSON(http.StatusOK, dto.Ok(st, ""))
}

// GET /api/admin/journal/favorites  各欄位最近用過的選項
func (h *JournalHandler) Favorites(c *gin.Context) {
	uid, ok := h.owner(c)
	if !ok {
		return
	}
	f, err := h.svc.Favorites(uid)
	if err != nil {
		handleErr(c, err, "查詢失敗")
		return
	}
	c.JSON(http.StatusOK, dto.Ok(f, ""))
}

// GET /api/admin/journal/export  匯出 Markdown
func (h *JournalHandler) Export(c *gin.Context) {
	uid, ok := h.owner(c)
	if !ok {
		return
	}
	md, err := h.svc.ExportMarkdown(uid)
	if err != nil {
		handleErr(c, err, "匯出失敗")
		return
	}
	c.Header("Content-Disposition", `attachment; filename="journal.md"`)
	c.Data(http.StatusOK, "text/markdown; charset=utf-8", []byte(md))
}

// GET /api/admin/journal/:date  沒寫過回空白，不是 404
func (h *JournalHandler) GetDay(c *gin.Context) {
	uid, ok := h.owner(c)
	if !ok {
		return
	}
	e, err := h.svc.GetDay(uid, c.Param("date"))
	if err != nil {
		handleErr(c, err, "查詢失敗")
		return
	}
	c.JSON(http.StatusOK, dto.Ok(e, ""))
}

// PUT /api/admin/journal/:date  一天一篇的 upsert
func (h *JournalHandler) UpsertDay(c *gin.Context) {
	uid, ok := h.owner(c)
	if !ok {
		return
	}
	var req dto.UpsertJournalEntryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("請求格式錯誤"))
		return
	}
	e, err := h.svc.UpsertDay(uid, c.Param("date"), &req)
	if err != nil {
		handleErr(c, err, "儲存失敗")
		return
	}
	c.JSON(http.StatusOK, dto.Ok(e, "已儲存"))
}

// DELETE /api/admin/journal/:date
func (h *JournalHandler) DeleteDay(c *gin.Context) {
	uid, ok := h.owner(c)
	if !ok {
		return
	}
	if err := h.svc.DeleteDay(uid, c.Param("date")); err != nil {
		handleErr(c, err, "刪除失敗")
		return
	}
	c.JSON(http.StatusOK, dto.Ok[any](nil, "已刪除"))
}
