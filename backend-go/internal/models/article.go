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
	Tags     []Tag     `gorm:"many2many:article_tags;" json:"tags"`
}
