package models

import "time"

type User struct {
	ID           uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	Email        string    `gorm:"uniqueIndex;not null;size:255" json:"email"`
	PasswordHash string    `gorm:"not null" json:"-"`
	DisplayName  string    `gorm:"not null;size:100" json:"displayName"`
	Avatar       *string   `gorm:"size:500" json:"avatar"`
	Role         string    `gorm:"not null;default:'user';size:20" json:"role"`
	IsActive     bool      `gorm:"not null;default:true" json:"isActive"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    *time.Time `json:"updatedAt"`
}
