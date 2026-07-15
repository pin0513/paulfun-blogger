package services

import (
	"fmt"
	"sort"
	"time"

	"github.com/paulhuang/paulfun-blogger/internal/apierror"
	"github.com/paulhuang/paulfun-blogger/internal/dto"
	"github.com/paulhuang/paulfun-blogger/internal/models"
	"gorm.io/gorm"
)

// seriesWalkLimit series 鏈走訪深度上限（防資料異常成環時無限迴圈）。
const seriesWalkLimit = 20

// ArticleLinkService 文章知識串連。
type ArticleLinkService struct {
	db *gorm.DB
}

func NewArticleLinkService(db *gorm.DB) *ArticleLinkService {
	return &ArticleLinkService{db: db}
}

// CreateLink 建立串連。Pre: 兩端存在、非 self-link、series 不得成環。
func (s *ArticleLinkService) CreateLink(fromID uint, req *dto.CreateArticleLinkRequest) (*dto.ArticleLinkDto, error) {
	if req.Relation != models.LinkRelationRelated && req.Relation != models.LinkRelationSeries {
		return nil, fmt.Errorf("%w: relation 僅接受 related / series", apierror.ErrBadRequest)
	}
	if fromID == req.ToArticleID {
		return nil, fmt.Errorf("%w: 不可將文章串連到自己", apierror.ErrBadRequest)
	}

	var count int64
	if err := s.db.Model(&models.Article{}).Where("id IN ?", []uint{fromID, req.ToArticleID}).Count(&count).Error; err != nil {
		return nil, err
	}
	if count != 2 {
		return nil, apierror.ErrNotFound
	}

	// series 防環：沿「from 承接 to」方向從 to 出發往舊走，不得回到 from
	if req.Relation == models.LinkRelationSeries {
		older, err := s.walkSeries(req.ToArticleID, false)
		if err != nil {
			return nil, err
		}
		for _, id := range older {
			if id == fromID {
				return nil, fmt.Errorf("%w: 此串連會使 series 成環", apierror.ErrBadRequest)
			}
		}
	}

	link := models.ArticleLink{
		FromArticleID: fromID,
		ToArticleID:   req.ToArticleID,
		Relation:      req.Relation,
		Note:          req.Note,
	}
	if err := s.db.Create(&link).Error; err != nil {
		return nil, fmt.Errorf("%w: 相同串連已存在", apierror.ErrConflict)
	}

	var to models.Article
	if err := s.db.First(&to, req.ToArticleID).Error; err != nil {
		return nil, err
	}
	d := mapLinkDto(link, to, "outgoing")
	return &d, nil
}

// GetLinks 該文所有串連（含雙向），後台管理用。
func (s *ArticleLinkService) GetLinks(articleID uint) ([]dto.ArticleLinkDto, error) {
	var article models.Article
	if err := s.db.First(&article, articleID).Error; err != nil {
		return nil, apierror.ErrNotFound
	}

	var links []models.ArticleLink
	if err := s.db.Preload("FromArticle").Preload("ToArticle").
		Where("from_article_id = ? OR to_article_id = ?", articleID, articleID).
		Order("created_at ASC").Find(&links).Error; err != nil {
		return nil, err
	}

	out := make([]dto.ArticleLinkDto, 0, len(links))
	for _, l := range links {
		if l.FromArticleID == articleID {
			out = append(out, mapLinkDto(l, l.ToArticle, "outgoing"))
		} else {
			out = append(out, mapLinkDto(l, l.FromArticle, "incoming"))
		}
	}
	return out, nil
}

// DeleteLink 刪除單一串連（linkID 必須屬於 articleID 任一端）。
func (s *ArticleLinkService) DeleteLink(articleID, linkID uint) error {
	var link models.ArticleLink
	if err := s.db.First(&link, linkID).Error; err != nil {
		return apierror.ErrNotFound
	}
	if link.FromArticleID != articleID && link.ToArticleID != articleID {
		return apierror.ErrNotFound
	}
	return s.db.Delete(&link).Error
}

// GetRelated 公開端：完整 series 鏈 + related 清單，僅含已發佈文章。
func (s *ArticleLinkService) GetRelated(articleID uint) (*dto.RelatedArticlesDto, error) {
	var article models.Article
	if err := s.db.First(&article, articleID).Error; err != nil {
		return nil, apierror.ErrNotFound
	}

	// series：往舊（outgoing）與往新（incoming）各走一遍，重建完整鏈
	olderIDs, err := s.walkSeries(articleID, false)
	if err != nil {
		return nil, err
	}
	newerIDs, err := s.walkSeries(articleID, true)
	if err != nil {
		return nil, err
	}

	seriesIDs := append(append(olderIDs, articleID), newerIDs...)
	series, err := s.loadSeriesItems(seriesIDs, articleID)
	if err != nil {
		return nil, err
	}
	// 全系列只剩自己一篇 = 沒有可顯示的系列
	if len(series) <= 1 {
		series = []dto.SeriesItemDto{}
	}

	// related：雙向收集去重
	var links []models.ArticleLink
	if err := s.db.Where("relation = ? AND (from_article_id = ? OR to_article_id = ?)",
		models.LinkRelationRelated, articleID, articleID).Find(&links).Error; err != nil {
		return nil, err
	}
	noteByID := map[uint]*string{}
	var relatedIDs []uint
	seen := map[uint]bool{}
	for _, l := range links {
		other := l.ToArticleID
		if other == articleID {
			other = l.FromArticleID
		}
		if !seen[other] {
			seen[other] = true
			relatedIDs = append(relatedIDs, other)
			noteByID[other] = l.Note
		}
	}
	related, err := s.loadPublishedItems(relatedIDs, noteByID)
	if err != nil {
		return nil, err
	}

	return &dto.RelatedArticlesDto{Series: series, Related: related}, nil
}

// walkSeries 沿 series 鏈走訪。newer=false 往舊走（沿 outgoing from→to）；
// newer=true 往新走（沿 incoming to←from）。回傳不含起點，按走訪順序。
func (s *ArticleLinkService) walkSeries(start uint, newer bool) ([]uint, error) {
	var out []uint
	visited := map[uint]bool{start: true}
	current := start
	for i := 0; i < seriesWalkLimit; i++ {
		var link models.ArticleLink
		var err error
		if newer {
			err = s.db.Where("relation = ? AND to_article_id = ?", models.LinkRelationSeries, current).First(&link).Error
		} else {
			err = s.db.Where("relation = ? AND from_article_id = ?", models.LinkRelationSeries, current).First(&link).Error
		}
		if err != nil {
			break // 鏈到底
		}
		next := link.ToArticleID
		if newer {
			next = link.FromArticleID
		}
		if visited[next] {
			break // 資料異常成環，停止
		}
		visited[next] = true
		out = append(out, next)
		current = next
	}
	if !newer {
		// 往舊走的結果是「近 → 遠」，反轉成「舊 → 新」方便串接
		for i, j := 0, len(out)-1; i < j; i, j = i+1, j-1 {
			out[i], out[j] = out[j], out[i]
		}
	}
	return out, nil
}

// loadSeriesItems 載入系列文章（保持傳入順序），濾掉未發佈；current 一律保留。
func (s *ArticleLinkService) loadSeriesItems(ids []uint, currentID uint) ([]dto.SeriesItemDto, error) {
	if len(ids) == 0 {
		return []dto.SeriesItemDto{}, nil
	}
	var articles []models.Article
	if err := s.db.Where("id IN ?", ids).Find(&articles).Error; err != nil {
		return nil, err
	}
	byID := map[uint]models.Article{}
	for _, a := range articles {
		byID[a.ID] = a
	}
	// series link 的 note 標在 from（較新那篇承接時的說明）
	var links []models.ArticleLink
	if err := s.db.Where("relation = ? AND from_article_id IN ?", models.LinkRelationSeries, ids).Find(&links).Error; err != nil {
		return nil, err
	}
	noteByFrom := map[uint]*string{}
	for _, l := range links {
		noteByFrom[l.FromArticleID] = l.Note
	}

	out := make([]dto.SeriesItemDto, 0, len(ids))
	for _, id := range ids {
		a, ok := byID[id]
		if !ok {
			continue
		}
		if a.Status != "published" && a.ID != currentID {
			continue // 未發佈不外洩；當前文章本身照常顯示
		}
		out = append(out, dto.SeriesItemDto{
			ID:          a.ID,
			Title:       a.Title,
			Slug:        a.Slug,
			PublishedAt: fmtTimePtr(a.PublishedAt),
			Note:        noteByFrom[a.ID],
			IsCurrent:   a.ID == currentID,
		})
	}
	return out, nil
}

// loadPublishedItems 載入 related 文章（僅已發佈），按 publishedAt 新 → 舊。
func (s *ArticleLinkService) loadPublishedItems(ids []uint, noteByID map[uint]*string) ([]dto.SeriesItemDto, error) {
	if len(ids) == 0 {
		return []dto.SeriesItemDto{}, nil
	}
	var articles []models.Article
	if err := s.db.Where("id IN ? AND status = ?", ids, "published").Find(&articles).Error; err != nil {
		return nil, err
	}
	sort.Slice(articles, func(i, j int) bool {
		ti, tj := time.Time{}, time.Time{}
		if articles[i].PublishedAt != nil {
			ti = *articles[i].PublishedAt
		}
		if articles[j].PublishedAt != nil {
			tj = *articles[j].PublishedAt
		}
		return ti.After(tj)
	})
	out := make([]dto.SeriesItemDto, 0, len(articles))
	for _, a := range articles {
		out = append(out, dto.SeriesItemDto{
			ID:          a.ID,
			Title:       a.Title,
			Slug:        a.Slug,
			PublishedAt: fmtTimePtr(a.PublishedAt),
			Note:        noteByID[a.ID],
		})
	}
	return out, nil
}

func mapLinkDto(l models.ArticleLink, other models.Article, direction string) dto.ArticleLinkDto {
	return dto.ArticleLinkDto{
		ID:        l.ID,
		Relation:  l.Relation,
		Note:      l.Note,
		Direction: direction,
		Article: dto.LinkedArticleDto{
			ID:          other.ID,
			Title:       other.Title,
			Slug:        other.Slug,
			Status:      other.Status,
			PublishedAt: fmtTimePtr(other.PublishedAt),
		},
	}
}

func fmtTimePtr(t *time.Time) *string {
	if t == nil {
		return nil
	}
	s := t.UTC().Format(time.RFC3339)
	return &s
}
