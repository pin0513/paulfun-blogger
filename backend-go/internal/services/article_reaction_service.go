package services

import (
	"github.com/paulhuang/paulfun-blogger/internal/apierror"
	"github.com/paulhuang/paulfun-blogger/internal/models"
	"gorm.io/gorm"
)

// LikeArticle 按讚（+1）。僅限已發佈文章；回傳最新計數。
// 匿名制：重複點擊由前端 localStorage 防範，後端以 rate limit 擋濫用。
func (s *ArticleService) LikeArticle(id uint) (int, error) {
	return s.adjustLike(id, +1)
}

// UnlikeArticle 收回讚（-1），計數不低於 0。
func (s *ArticleService) UnlikeArticle(id uint) (int, error) {
	return s.adjustLike(id, -1)
}

func (s *ArticleService) adjustLike(id uint, delta int) (int, error) {
	var article models.Article
	if err := s.db.Select("id", "status", "like_count").First(&article, id).Error; err != nil {
		return 0, apierror.ErrNotFound
	}
	if article.Status != "published" {
		return 0, apierror.ErrNotFound // 草稿不對外洩漏存在性
	}

	// 原子更新；-1 時以 GREATEST 保證不低於 0
	expr := gorm.Expr("like_count + ?", delta)
	if delta < 0 {
		expr = gorm.Expr("GREATEST(like_count + ?, 0)", delta)
	}
	if err := s.db.Model(&models.Article{}).Where("id = ?", id).
		UpdateColumn("like_count", expr).Error; err != nil {
		return 0, err
	}

	var updated models.Article
	if err := s.db.Select("like_count").First(&updated, id).Error; err != nil {
		return 0, err
	}
	return updated.LikeCount, nil
}
