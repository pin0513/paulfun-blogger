package models

import "time"

type Media struct {
	ID         uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	FileName   string    `gorm:"not null;size:255" json:"fileName"`
	FilePath   string    `gorm:"not null;size:500" json:"filePath"`
	FileSize   int64     `gorm:"not null" json:"fileSize"`
	MimeType   string    `gorm:"not null;size:100" json:"mimeType"`
	UploadedBy uint      `gorm:"not null;index" json:"uploadedBy"`
	CreatedAt  time.Time `json:"createdAt"`

	// Association
	Uploader User `gorm:"foreignKey:UploadedBy" json:"uploader"`
}
