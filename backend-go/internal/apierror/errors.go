// Package apierror 定義 Service 層回傳的 sentinel 錯誤，
// 讓 Handler 層用 errors.Is 對應到正確的 HTTP 狀態碼。
package apierror

import "errors"

var (
	// ErrNotFound 資源不存在（→ 404）
	ErrNotFound = errors.New("resource not found")

	// ErrForbidden 權限不足（→ 403）
	ErrForbidden = errors.New("permission denied")

	// ErrConflict 資料衝突，例如 email 重複（→ 409）
	ErrConflict = errors.New("resource conflict")

	// ErrBadRequest 業務層驗證失敗（→ 400）
	ErrBadRequest = errors.New("bad request")

	// ErrUnauthorized 未登入（→ 422，避免前端 401 interceptor 攔截）
	ErrUnauthorized = errors.New("unauthorized")
)
