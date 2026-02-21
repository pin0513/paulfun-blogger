package router

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/paulhuang/paulfun-blogger/internal/config"
	"github.com/paulhuang/paulfun-blogger/internal/handlers"
	"github.com/paulhuang/paulfun-blogger/internal/middleware"
)

type Handlers struct {
	Auth    *handlers.AuthHandler
	Article *handlers.ArticleHandler
	Admin   *handlers.AdminHandler
	Media   *handlers.MediaHandler
	Import  *handlers.ImportHandler
}

func Setup(cfg *config.Config, h Handlers, uploadDir string) *gin.Engine {
	r := gin.Default()
	r.MaxMultipartMemory = 5 << 20 // 5MB

	// CORS
	r.Use(middleware.CORS())

	// 健康檢查
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// 靜態檔案（上傳的媒體）
	r.Static("/uploads", uploadDir)

	api := r.Group("/api")

	// ── 認證（無需 token）────────────────────────────────────
	auth := api.Group("/auth")
	{
		auth.POST("/login", h.Auth.Login)
		auth.POST("/register", h.Auth.Register)
		auth.GET("/me", middleware.AuthRequired(cfg.JWTSecret), h.Auth.Me)
	}

	// ── 前台公開 API ──────────────────────────────────────
	// 注意：固定路徑（categories, tags）必須在 /:id 之前（Gin 規則）
	articles := api.Group("/articles")
	{
		articles.GET("", h.Article.ListArticles)
		articles.GET("/categories", h.Article.ListCategories)
		articles.GET("/tags", h.Article.ListTags)
		articles.GET("/:id", h.Article.GetArticleByID)
	}

	// ── 後台 API（需要認證）──────────────────────────────────
	admin := api.Group("/admin")
	admin.Use(middleware.AuthRequired(cfg.JWTSecret))
	{
		// Articles
		admin.GET("/articles", h.Admin.ListArticles)
		admin.GET("/articles/:id", h.Admin.GetArticle)
		admin.POST("/articles", h.Admin.CreateArticle)
		admin.PUT("/articles/:id", h.Admin.UpdateArticle)
		admin.DELETE("/articles/:id", h.Admin.DeleteArticle)
		admin.POST("/articles/:id/publish", h.Admin.PublishArticle)
		admin.POST("/articles/:id/unpublish", h.Admin.UnpublishArticle)

		// Media
		admin.GET("/media", h.Media.ListMedia)
		admin.GET("/media/:id", h.Media.GetMedia)
		admin.POST("/media/upload", h.Media.Upload)
		admin.DELETE("/media/:id", h.Media.Delete)

		// Import（批量匯入）
		admin.POST("/import/categories", h.Import.ImportCategories)
		admin.POST("/import/tags", h.Import.ImportTags)
		admin.POST("/import/articles", h.Import.ImportArticles)
	}

	return r
}
