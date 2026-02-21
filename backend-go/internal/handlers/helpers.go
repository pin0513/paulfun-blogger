package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/paulhuang/paulfun-blogger/internal/apierror"
	"github.com/paulhuang/paulfun-blogger/internal/dto"
)

// parseUintParam 從 URL param 解析 uint ID。
func parseUintParam(c *gin.Context, key string) (uint, error) {
	val, err := strconv.ParseUint(c.Param(key), 10, 64)
	if err != nil {
		return 0, err
	}
	return uint(val), nil
}

// getUserIDFromContext 從 JWT middleware 注入的 context 取出 userID。
func getUserIDFromContext(c *gin.Context) (uint, bool) {
	rawID, exists := c.Get("userID")
	if !exists {
		return 0, false
	}
	idStr, ok := rawID.(string)
	if !ok {
		return 0, false
	}
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		return 0, false
	}
	return uint(id), true
}

// handleErr 將 service 層 sentinel error 映射到對應 HTTP 狀態碼並回傳 JSON。
// 呼叫後應立即 return。
func handleErr(c *gin.Context, err error, fallbackMsg string) {
	switch {
	case errors.Is(err, apierror.ErrNotFound):
		c.JSON(http.StatusNotFound, dto.Fail[any](err.Error()))
	case errors.Is(err, apierror.ErrForbidden):
		c.JSON(http.StatusForbidden, dto.Fail[any](err.Error()))
	case errors.Is(err, apierror.ErrConflict):
		c.JSON(http.StatusConflict, dto.Fail[any](err.Error()))
	case errors.Is(err, apierror.ErrBadRequest):
		c.JSON(http.StatusBadRequest, dto.Fail[any](err.Error()))
	case errors.Is(err, apierror.ErrUnauthorized):
		// 使用 422 而非 401，避免前端 401 interceptor 強制跳轉 /login
		c.JSON(http.StatusUnprocessableEntity, dto.Fail[any](err.Error()))
	default:
		c.JSON(http.StatusInternalServerError, dto.Fail[any](fallbackMsg))
	}
}
