package models

type Category struct {
	ID        uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	Name      string    `gorm:"not null;size:100" json:"name"`
	Slug      string    `gorm:"uniqueIndex;not null;size:100" json:"slug"`
	ParentID  *uint     `gorm:"index" json:"parentId"`
	SortOrder int       `gorm:"default:0" json:"sortOrder"`
	Articles  []Article `gorm:"foreignKey:CategoryID" json:"-"`
}
