package models

import "time"

type Article struct {
	ID         uint       `gorm:"primaryKey;autoIncrement" json:"id"`
	Title      string     `gorm:"not null;size:500" json:"title"`
	Slug       string     `gorm:"uniqueIndex;not null;size:500" json:"slug"`
	Summary    *string    `gorm:"type:text" json:"summary"`
	Content    *string    `gorm:"type:text" json:"content"`
	CoverImage *string    `gorm:"size:500" json:"coverImage"`
	CategoryID *uint      `gorm:"index" json:"categoryId"`
	AuthorID   uint       `gorm:"not null;index" json:"authorId"`
	Status     string     `gorm:"not null;default:'draft';size:20" json:"status"`
	PublishedAt *time.Time `json:"publishedAt"`
	ViewCount  int        `gorm:"default:0" json:"viewCount"`
	Version    int        `gorm:"default:1" json:"version"`
	CreatedAt  time.Time  `json:"createdAt"`
	UpdatedAt  *time.Time `json:"updatedAt"`

	// Associations
	Author   User      `gorm:"foreignKey:AuthorID" json:"author"`
	Category *Category `gorm:"foreignKey:CategoryID" json:"category"`
	// many2many 預設 FK 為 RESTRICT；明寫 CASCADE 讓未來新環境 AutoMigrate
	// 的 article_tags 一開始就有正確 FK。既有 production DB 的 FK 由
	// services.DeleteArticle 透過 transaction 手動清 pivot 處理。
	Tags []Tag `gorm:"many2many:article_tags;constraint:OnDelete:CASCADE,OnUpdate:CASCADE;" json:"tags"`
}
