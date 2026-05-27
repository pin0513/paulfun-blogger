package main

import (
	"log"

	"github.com/paulhuang/paulfun-blogger/internal/config"
	"github.com/paulhuang/paulfun-blogger/internal/db"
	"github.com/paulhuang/paulfun-blogger/internal/handlers"
	"github.com/paulhuang/paulfun-blogger/internal/router"
	"github.com/paulhuang/paulfun-blogger/internal/services"
	"github.com/paulhuang/paulfun-blogger/internal/storage"
)

func main() {
	// 1. 載入設定
	cfg := config.Load()

	// 2. 初始化資料庫（AutoMigrate）
	database := db.Init(cfg)

	// 3. Seed 初始資料（首次啟動）
	db.Seed(database)

	// 4. 初始化 Storage
	var store storage.Storage
	switch cfg.StorageType {
	case "r2":
		store = storage.NewR2Storage(
			cfg.R2AccountID,
			cfg.R2AccessKeyID,
			cfg.R2SecretAccessKey,
			cfg.R2Bucket,
			cfg.R2PublicURL,
		)
		log.Printf("Storage: Cloudflare R2 (bucket=%s)", cfg.R2Bucket)
	default:
		store = storage.NewLocalStorage(cfg.UploadDir, cfg.BaseURL)
		log.Printf("Storage: Local (dir=%s)", cfg.UploadDir)
	}

	// 5. 初始化 Services
	authSvc := services.NewAuthService(database, cfg)
	articleSvc := services.NewArticleService(database)
	mediaSvc := services.NewMediaService(database, store)
	importSvc := services.NewImportService(database)
	categorySvc := services.NewCategoryService(database)
	satSvc := services.NewSATService(database)

	// 5a. 確保「未分類」固定分類存在
	// DELETE 任何分類時，文章會被 reassign 到此處；本身不可刪。
	if err := categorySvc.EnsureUncategorized(); err != nil {
		log.Fatalf("EnsureUncategorized 失敗: %v", err)
	}

	// 6. 初始化 Handlers
	h := router.Handlers{
		Auth:     handlers.NewAuthHandler(authSvc, satSvc),
		Article:  handlers.NewArticleHandler(articleSvc),
		Admin:    handlers.NewAdminHandler(articleSvc),
		Media:    handlers.NewMediaHandler(mediaSvc),
		Import:   handlers.NewImportHandler(importSvc),
		Category: handlers.NewCategoryHandler(categorySvc),
		SATAdmin: handlers.NewSATAdminHandler(satSvc),
	}

	// 7. 設定路由
	r := router.Setup(cfg, h, cfg.UploadDir)

	addr := ":" + cfg.Port
	log.Printf("PaulFun Blogger Go server 啟動於 %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("Server 啟動失敗: %v", err)
	}
}
