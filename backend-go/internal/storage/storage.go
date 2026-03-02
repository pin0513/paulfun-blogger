package storage

import (
	"context"
	"io"
)

// Storage 定義檔案儲存的抽象介面。
// 本地開發使用 LocalStorage，生產環境使用 R2Storage。
type Storage interface {
	// Upload 上傳檔案並回傳公開 URL。
	// key 為相對路徑，例如 "uploads/2026/03/abc.jpg"。
	Upload(ctx context.Context, key string, reader io.Reader, contentType string) (url string, err error)

	// Delete 刪除指定 key 的檔案。
	Delete(ctx context.Context, key string) error

	// URL 回傳指定 key 的公開存取 URL。
	URL(key string) string
}
