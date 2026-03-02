package storage

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// LocalStorage 將檔案儲存在本地檔案系統（開發環境用）。
type LocalStorage struct {
	uploadDir string // 本地上傳根目錄，例如 "./uploads"
	baseURL   string // API server 的 base URL，例如 "http://localhost:5266"
}

func NewLocalStorage(uploadDir, baseURL string) *LocalStorage {
	return &LocalStorage{uploadDir: uploadDir, baseURL: baseURL}
}

func (s *LocalStorage) Upload(_ context.Context, key string, reader io.Reader, _ string) (string, error) {
	// key 格式: "uploads/2026/03/file.jpg"
	// 轉成本地路徑: "./uploads/2026/03/file.jpg"
	rel := strings.TrimPrefix(key, "uploads/")
	fullPath := filepath.Join(s.uploadDir, rel)

	if err := os.MkdirAll(filepath.Dir(fullPath), 0755); err != nil {
		return "", fmt.Errorf("無法建立上傳目錄: %w", err)
	}

	dst, err := os.Create(fullPath)
	if err != nil {
		return "", fmt.Errorf("儲存檔案失敗: %w", err)
	}
	defer dst.Close()

	if _, err := io.Copy(dst, reader); err != nil {
		return "", fmt.Errorf("寫入檔案失敗: %w", err)
	}

	return s.URL(key), nil
}

func (s *LocalStorage) Delete(_ context.Context, key string) error {
	rel := strings.TrimPrefix(key, "uploads/")
	fullPath := filepath.Join(s.uploadDir, rel)

	if _, err := os.Stat(fullPath); err == nil {
		return os.Remove(fullPath)
	}
	return nil // 檔案不存在不算錯誤
}

func (s *LocalStorage) URL(key string) string {
	return fmt.Sprintf("%s/%s", s.baseURL, key)
}
