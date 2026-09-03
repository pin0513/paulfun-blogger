package handlers

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/paulhuang/paulfun-blogger/internal/dto"
)

// stubSource 只回它被設定好的東西 —— 這一層要測的是 HTTP 契約，
// 不是資料庫查詢，所以不該為了跑這條測試而準備一個資料庫。
type stubSource struct {
	article *dto.ArticleDto
	err     error
}

func (s stubSource) GetPublishedArticleByID(uint) (*dto.ArticleDto, error) {
	return s.article, s.err
}

func newTestRouter(src articleMarkdownSource) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	h := NewMarkdownHandler(src, "https://paulfun.net")
	r.GET("/api/articles/:id/markdown", h.GetArticleMarkdown)
	return r
}

func TestGetArticleMarkdown_ServesMarkdownContentType(t *testing.T) {
	content := "<h2>標題</h2><p>內文</p>"
	published := time.Date(2026, 9, 1, 0, 0, 0, 0, time.UTC)
	r := newTestRouter(stubSource{article: &dto.ArticleDto{
		ID: 289, Title: "測試文章", Content: &content, PublishedAt: &published,
	}})

	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/api/articles/289/markdown", nil))

	if w.Code != http.StatusOK {
		t.Fatalf("已發佈文章應回 200，得到 %d", w.Code)
	}
	// Content-Type 決定瀏覽器與 AI agent 怎麼對待它。回 application/json
	// 或 text/html 的話，這個端點就失去「可直接讀的純文字」這個意義。
	if ct := w.Header().Get("Content-Type"); !strings.HasPrefix(ct, "text/markdown") {
		t.Errorf("Content-Type 應為 text/markdown，得到 %q", ct)
	}
	if !strings.HasPrefix(w.Body.String(), "---") {
		t.Errorf("內容應以 YAML front matter 開頭，得到：\n%s", w.Body.String())
	}
}

func TestGetArticleMarkdown_NotFoundStaysNotFound(t *testing.T) {
	r := newTestRouter(stubSource{err: errors.New("not found")})

	w := httptest.NewRecorder()
	r.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/api/articles/99999/markdown", nil))

	if w.Code != http.StatusNotFound {
		t.Errorf("不存在或未發佈的文章應回 404，得到 %d", w.Code)
	}
}
