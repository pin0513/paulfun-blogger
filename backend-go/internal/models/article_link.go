package models

import "time"

// ArticleLink 文章之間的顯式知識串連。
//
// relation 語意：
//   - "related"：兩篇相關（無方向性，查詢時雙向收集）
//   - "series"：演進系列，方向固定「新 → 舊」（from 承接 to），
//     三部曲即一條 series 鏈，查詢時沿鏈雙向走訪重建完整系列。
type ArticleLink struct {
	ID            uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	FromArticleID uint      `gorm:"not null;index;uniqueIndex:uq_article_link" json:"fromArticleId"`
	ToArticleID   uint      `gorm:"not null;index;uniqueIndex:uq_article_link" json:"toArticleId"`
	Relation      string    `gorm:"not null;size:20;uniqueIndex:uq_article_link" json:"relation"`
	Note          *string   `gorm:"size:200" json:"note"`
	CreatedAt     time.Time `json:"createdAt"`

	FromArticle Article `gorm:"foreignKey:FromArticleID" json:"-"`
	ToArticle   Article `gorm:"foreignKey:ToArticleID" json:"-"`
}

const (
	LinkRelationRelated = "related"
	LinkRelationSeries  = "series"
)
