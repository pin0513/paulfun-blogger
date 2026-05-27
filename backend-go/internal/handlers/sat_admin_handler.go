package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/paulhuang/paulfun-blogger/internal/apierror"
	"github.com/paulhuang/paulfun-blogger/internal/dto"
	"github.com/paulhuang/paulfun-blogger/internal/middleware"
	"github.com/paulhuang/paulfun-blogger/internal/services"
)

// SATAdminHandler 管理 service-account-token 的 admin CRUD endpoints。
//
// 設計取捨見 docs/specs/2026-05-26-service-account-token-design.md (v3 §2.10)。
// 每個 endpoint 入口檢查 RejectSATSource — 拒絕 SAT-issued JWT 操作 SAT 自己（R7）。
type SATAdminHandler struct {
	svc *services.SATService
}

func NewSATAdminHandler(svc *services.SATService) *SATAdminHandler {
	return &SATAdminHandler{svc: svc}
}

// rejectSATSource 內部 helper：如果當前 request 帶的 JWT 來自 SAT exchange，
// 直接回 403 並回傳 true（呼叫端應 return）。
// 防止外洩的 SAT 自己延期、改名、再生新 token（spec v3 R7）。
func (h *SATAdminHandler) rejectSATSource(c *gin.Context) bool {
	raw, exists := c.Get("claims")
	if !exists {
		c.AbortWithStatusJSON(http.StatusUnauthorized, dto.Fail[any]("未登入"))
		return true
	}
	cl, ok := raw.(*middleware.Claims)
	if !ok {
		c.AbortWithStatusJSON(http.StatusUnauthorized, dto.Fail[any]("Token 格式錯誤"))
		return true
	}
	if cl.SatID != 0 {
		c.AbortWithStatusJSON(http.StatusForbidden, dto.Fail[any]("SAT-issued tokens cannot manage SAT"))
		return true
	}
	return false
}

// GET /api/admin/service-account-tokens
func (h *SATAdminHandler) List(c *gin.Context) {
	if h.rejectSATSource(c) {
		return
	}
	sats, err := h.svc.List()
	if err != nil {
		handleErr(c, err, "列出 SAT 失敗")
		return
	}
	c.JSON(http.StatusOK, dto.Ok(sats, "ok"))
}

// POST /api/admin/service-account-tokens
// Response 含 plaintext token，唯一一次顯示。
func (h *SATAdminHandler) Create(c *gin.Context) {
	if h.rejectSATSource(c) {
		return
	}
	var req dto.SATCreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("請求格式錯誤: "+err.Error()))
		return
	}
	plaintext, sat, err := h.svc.Create(req.UserID, req.Name, req.ExpiresAt)
	if err != nil {
		if errors.Is(err, apierror.ErrBadRequest) {
			c.JSON(http.StatusBadRequest, dto.Fail[any]("無效的 user_id 或 user 已停用"))
			return
		}
		handleErr(c, err, "建立 SAT 失敗")
		return
	}
	resp := dto.SATCreateResponse{
		SATDto: dto.SATDto{
			ID:          sat.ID,
			UserID:      sat.UserID,
			Name:        sat.Name,
			TokenPrefix: sat.TokenPrefix,
			IsActive:    sat.IsActive,
			ExpiresAt:   sat.ExpiresAt,
			LastUsedAt:  sat.LastUsedAt,
			CreatedAt:   sat.CreatedAt,
			UpdatedAt:   sat.UpdatedAt,
		},
		Token: plaintext,
	}
	c.JSON(http.StatusCreated, dto.Ok(resp, "SAT 建立成功（明文 token 僅顯示一次）"))
}

// PATCH /api/admin/service-account-tokens/:id
func (h *SATAdminHandler) Update(c *gin.Context) {
	if h.rejectSATSource(c) {
		return
	}
	id, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("invalid id"))
		return
	}
	var req dto.SATUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("請求格式錯誤: "+err.Error()))
		return
	}
	actorID, _ := getUserIDFromContext(c)
	updated, err := h.svc.Update(id, req, actorID)
	if err != nil {
		handleErr(c, err, "更新 SAT 失敗")
		return
	}
	c.JSON(http.StatusOK, dto.Ok(updated, "更新成功"))
}

// DELETE /api/admin/service-account-tokens/:id
// 實際是 soft delete（is_active=false）以保留 audit 完整性（spec v3 §1.5.3）。
func (h *SATAdminHandler) Delete(c *gin.Context) {
	if h.rejectSATSource(c) {
		return
	}
	id, err := parseUintParam(c, "id")
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("invalid id"))
		return
	}
	actorID, _ := getUserIDFromContext(c)
	if err := h.svc.SoftDelete(id, actorID); err != nil {
		handleErr(c, err, "刪除 SAT 失敗")
		return
	}
	c.JSON(http.StatusOK, dto.Ok[any](nil, "已停用 SAT"))
}
