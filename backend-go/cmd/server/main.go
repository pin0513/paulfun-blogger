package main

import (
	"log"

	"github.com/paulhuang/paulfun-blogger/internal/config"
	"github.com/paulhuang/paulfun-blogger/internal/db"
	"github.com/paulhuang/paulfun-blogger/internal/handlers"
	"github.com/paulhuang/paulfun-blogger/internal/router"
	"github.com/paulhuang/paulfun-blogger/internal/services"
)

func main() {
	// 1. 載入設定
	cfg := config.Load()

	// 2. 初始化資料庫（AutoMigrate）
	database := db.Init(cfg)

	// 3. Seed 初始資料（首次啟動）
	db.Seed(database)

	// 4. 初始化 Services
	authSvc := services.NewAuthService(database, cfg)
	articleSvc := services.NewArticleService(database)
	mediaSvc := services.NewMediaService(database, cfg)
	importSvc := services.NewImportService(database)

	// 5. 初始化 Handlers
	h := router.Handlers{
		Auth:    handlers.NewAuthHandler(authSvc),
		Article: handlers.NewArticleHandler(articleSvc),
		Admin:   handlers.NewAdminHandler(articleSvc),
		Media:   handlers.NewMediaHandler(mediaSvc),
		Import:  handlers.NewImportHandler(importSvc),
	}

	// 6. 設定路由
	r := router.Setup(cfg, h, cfg.UploadDir)

	addr := ":" + cfg.Port
	log.Printf("PaulFun Blogger Go server 啟動於 %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("Server 啟動失敗: %v", err)
	}
}
