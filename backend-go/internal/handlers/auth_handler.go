package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/paulhuang/paulfun-blogger/internal/apierror"
	"github.com/paulhuang/paulfun-blogger/internal/dto"
	"github.com/paulhuang/paulfun-blogger/internal/middleware"
	"github.com/paulhuang/paulfun-blogger/internal/services"
)

// AuthHandler 處理認證相關 API（登入、註冊、取得目前使用者）。
type AuthHandler struct {
	svc *services.AuthService
}

func NewAuthHandler(svc *services.AuthService) *AuthHandler {
	return &AuthHandler{svc: svc}
}

// POST /api/auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	var req dto.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("請求格式錯誤: "+err.Error()))
		return
	}

	authResp, err := h.svc.Login(req)
	if err != nil {
		if errors.Is(err, apierror.ErrUnauthorized) {
			// 使用 422 而非 401，避免前端 401 interceptor 攔截並強制跳轉 /login
			c.JSON(http.StatusUnprocessableEntity, dto.Fail[any]("帳號或密碼錯誤"))
			return
		}
		c.JSON(http.StatusInternalServerError, dto.Fail[any]("伺服器錯誤"))
		return
	}

	c.JSON(http.StatusOK, dto.Ok(authResp, "登入成功"))
}

// POST /api/auth/register
func (h *AuthHandler) Register(c *gin.Context) {
	var req dto.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("請求格式錯誤: "+err.Error()))
		return
	}

	authResp, err := h.svc.Register(req)
	if err != nil {
		if errors.Is(err, apierror.ErrConflict) {
			c.JSON(http.StatusConflict, dto.Fail[any]("此 Email 已被註冊"))
			return
		}
		c.JSON(http.StatusInternalServerError, dto.Fail[any]("伺服器錯誤"))
		return
	}

	c.JSON(http.StatusCreated, dto.Ok(authResp, "註冊成功"))
}

// GET /api/auth/me
func (h *AuthHandler) Me(c *gin.Context) {
	claims, exists := c.Get("claims")
	if !exists {
		c.JSON(http.StatusUnauthorized, dto.Fail[any]("未登入"))
		return
	}

	cl := claims.(*middleware.Claims)
	id, err := strconv.ParseUint(cl.Sub, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("Token 格式錯誤"))
		return
	}

	user, err := h.svc.GetUserByID(uint(id))
	if err != nil {
		handleErr(c, err, "使用者不存在")
		return
	}

	c.JSON(http.StatusOK, dto.Ok(dto.UserDto{
		ID:          user.ID,
		Email:       user.Email,
		DisplayName: user.DisplayName,
		Avatar:      user.Avatar,
		Role:        user.Role,
	}, fmt.Sprintf("使用者 %s", user.DisplayName)))
}
