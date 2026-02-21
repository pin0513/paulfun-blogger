package db

import (
	"log"

	"github.com/paulhuang/paulfun-blogger/internal/config"
	"github.com/paulhuang/paulfun-blogger/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Init(cfg *config.Config) *gorm.DB {
	db, err := gorm.Open(postgres.Open(cfg.DSN()), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatalf("無法連線到資料庫: %v", err)
	}

	// AutoMigrate：依照 models 自動建立/更新資料表
	if err := db.AutoMigrate(
		&models.User{},
		&models.Category{},
		&models.Tag{},
		&models.Article{},
		&models.Media{},
	); err != nil {
		log.Fatalf("AutoMigrate 失敗: %v", err)
	}

	log.Println("資料庫連線成功，Migration 完成")
	return db
}
