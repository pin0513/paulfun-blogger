package models

import "time"

// ArticleArchive 文章歷史版本備份，每次更新文章前自動建立。
type ArticleArchive struct {
	ID         uint       `gorm:"primaryKey;autoIncrement" json:"id"`
	ArticleID  uint       `gorm:"not null;index" json:"articleId"`
	Title      string     `gorm:"not null;size:500" json:"title"`
	Slug       string     `gorm:"not null;size:500" json:"slug"`
	Summary    *string    `gorm:"type:text" json:"summary"`
	Content    *string    `gorm:"type:text" json:"content"`
	CoverImage *string    `gorm:"size:500" json:"coverImage"`
	CategoryID *uint      `gorm:"index" json:"categoryId"`
	Status     string     `gorm:"not null;size:20" json:"status"`
	Version    int        `json:"version"`
	TagIDs     string     `gorm:"type:text" json:"tagIds"` // JSON array string, e.g. "[1,2,3]"
	ArchivedAt time.Time  `gorm:"not null" json:"archivedAt"`
	ArchivedBy uint       `gorm:"not null" json:"archivedBy"`
}
