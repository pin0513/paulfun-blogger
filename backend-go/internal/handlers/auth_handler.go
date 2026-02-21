package handlers

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/paulhuang/paulfun-blogger/internal/dto"
	"github.com/paulhuang/paulfun-blogger/internal/middleware"
	"github.com/paulhuang/paulfun-blogger/internal/services"
)

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

	resp, err := h.svc.Login(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail[any]("伺服器錯誤"))
		return
	}

	if !resp.Success {
		c.JSON(http.StatusUnauthorized, resp)
		return
	}

	c.JSON(http.StatusOK, resp)
}

// POST /api/auth/register
func (h *AuthHandler) Register(c *gin.Context) {
	var req dto.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, dto.Fail[any]("請求格式錯誤: "+err.Error()))
		return
	}

	resp, err := h.svc.Register(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.Fail[any]("伺服器錯誤"))
		return
	}

	if !resp.Success {
		c.JSON(http.StatusConflict, resp)
		return
	}

	c.JSON(http.StatusCreated, resp)
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
		c.JSON(http.StatusNotFound, dto.Fail[any]("使用者不存在"))
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
