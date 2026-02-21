package dto

// ApiResponse 泛型 API 回應結構（前端零修改關鍵）
type ApiResponse[T any] struct {
	Success bool   `json:"success"`
	Data    T      `json:"data"`
	Message string `json:"message"`
}

// PagedResponse 泛型分頁回應結構（與前端 PagedResponse<T> 完全對應）
type PagedResponse[T any] struct {
	Items           []T  `json:"items"`
	TotalCount      int  `json:"totalCount"`
	Page            int  `json:"page"`
	PageSize        int  `json:"pageSize"`
	TotalPages      int  `json:"totalPages"`
	HasPreviousPage bool `json:"hasPreviousPage"`
	HasNextPage     bool `json:"hasNextPage"`
}

func Ok[T any](data T, message string) ApiResponse[T] {
	return ApiResponse[T]{Success: true, Data: data, Message: message}
}

func Fail[T any](message string) ApiResponse[T] {
	var zero T
	return ApiResponse[T]{Success: false, Data: zero, Message: message}
}
