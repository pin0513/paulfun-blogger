package models

type Tag struct {
	ID       uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	Name     string    `gorm:"not null;size:100" json:"name"`
	Slug     string    `gorm:"uniqueIndex;not null;size:100" json:"slug"`
	Articles []Article `gorm:"many2many:article_tags;" json:"-"`
}
