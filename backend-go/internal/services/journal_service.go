package services

import (
	"fmt"
	"strings"
	"time"

	"github.com/paulhuang/paulfun-blogger/internal/apierror"
	"github.com/paulhuang/paulfun-blogger/internal/dto"
	"github.com/paulhuang/paulfun-blogger/internal/models"
	"gorm.io/gorm"
)

// JournalService 自我覺察日記。
//
// 不變量：每一個方法都收 userID，且每一句 SQL 都帶 user_id 條件。
// 沒有任何方法可以在不指定 userID 的情況下取得資料——這是刻意的，
// 讓「忘記 scope」在編譯期就寫不出來。
type JournalService struct {
	db *gorm.DB
}

func NewJournalService(db *gorm.DB) *JournalService {
	return &JournalService{db: db}
}

func (s *JournalService) List(userID uint, q dto.JournalQueryParams) (dto.PagedResponse[dto.JournalEntryListItemDto], error) {
	empty := dto.PagedResponse[dto.JournalEntryListItemDto]{}
	query := s.db.Model(&models.JournalEntry{}).Where("user_id = ?", userID)

	if q.Search != "" {
		like := "%" + strings.ToLower(q.Search) + "%"
		query = query.Where(
			"LOWER(title) LIKE ? OR LOWER(COALESCE(behavior,'')) LIKE ? OR "+
				"LOWER(COALESCE(feeling,'')) LIKE ? OR LOWER(COALESCE(insight,'')) LIKE ?",
			like, like, like, like)
	}
	if q.Coping != "" {
		query = query.Where("coping = ?", q.Coping)
	}
	if q.DateFrom != "" {
		if t, err := time.Parse("2006-01-02", q.DateFrom); err == nil {
			query = query.Where("occurred_at >= ?", t)
		}
	}
	if q.DateTo != "" {
		if t, err := time.Parse("2006-01-02", q.DateTo); err == nil {
			query = query.Where("occurred_at < ?", t.AddDate(0, 0, 1))
		}
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return empty, err
	}

	page, pageSize := q.Page, q.PageSize
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}

	var rows []models.JournalEntry
	if err := query.Order("occurred_at DESC").
		Offset((page - 1) * pageSize).Limit(pageSize).Find(&rows).Error; err != nil {
		return empty, err
	}

	items := make([]dto.JournalEntryListItemDto, len(rows))
	for i, e := range rows {
		items[i] = dto.JournalEntryListItemDto{
			ID: e.ID, OccurredAt: e.OccurredAt, Title: e.Title,
			Coping: e.Coping, Mood: e.Mood, Tags: e.Tags,
			Excerpt:     excerpt(e),
			DepthFilled: depthFilled(e),
		}
	}
	totalPages := (int(total) + pageSize - 1) / pageSize
	if totalPages == 0 {
		totalPages = 1
	}
	return dto.PagedResponse[dto.JournalEntryListItemDto]{
		Items: items, TotalCount: int(total), Page: page, PageSize: pageSize,
		TotalPages: totalPages, HasPreviousPage: page > 1, HasNextPage: page < totalPages,
	}, nil
}

func (s *JournalService) Get(userID, id uint) (*dto.JournalEntryDto, error) {
	var e models.JournalEntry
	if err := s.db.Where("id = ? AND user_id = ?", id, userID).First(&e).Error; err != nil {
		return nil, apierror.ErrNotFound
	}
	d := mapJournalDto(e)
	return &d, nil
}

func (s *JournalService) Create(userID uint, req *dto.UpsertJournalEntryRequest) (*dto.JournalEntryDto, error) {
	if err := validateUpsert(req); err != nil {
		return nil, err
	}
	occurred := time.Now().UTC()
	if req.OccurredAt != nil {
		occurred = *req.OccurredAt
	}
	e := models.JournalEntry{
		UserID: userID, OccurredAt: occurred, Title: strings.TrimSpace(req.Title),
		Behavior: req.Behavior, Coping: req.Coping, Feeling: req.Feeling,
		FeelingAbout: req.FeelingAbout, Viewpoint: req.Viewpoint,
		Expectation: req.Expectation, Yearning: req.Yearning, Self: req.Self,
		Insight: req.Insight, NextAction: req.NextAction, Mood: req.Mood, Tags: req.Tags,
	}
	if err := s.db.Create(&e).Error; err != nil {
		return nil, err
	}
	d := mapJournalDto(e)
	return &d, nil
}

func (s *JournalService) Update(userID, id uint, req *dto.UpsertJournalEntryRequest) (*dto.JournalEntryDto, error) {
	if err := validateUpsert(req); err != nil {
		return nil, err
	}
	var e models.JournalEntry
	if err := s.db.Where("id = ? AND user_id = ?", id, userID).First(&e).Error; err != nil {
		return nil, apierror.ErrNotFound
	}
	e.Title = strings.TrimSpace(req.Title)
	if req.OccurredAt != nil {
		e.OccurredAt = *req.OccurredAt
	}
	e.Behavior, e.Coping, e.Feeling = req.Behavior, req.Coping, req.Feeling
	e.FeelingAbout, e.Viewpoint = req.FeelingAbout, req.Viewpoint
	e.Expectation, e.Yearning, e.Self = req.Expectation, req.Yearning, req.Self
	e.Insight, e.NextAction, e.Mood, e.Tags = req.Insight, req.NextAction, req.Mood, req.Tags
	if err := s.db.Save(&e).Error; err != nil {
		return nil, err
	}
	d := mapJournalDto(e)
	return &d, nil
}

func (s *JournalService) Delete(userID, id uint) error {
	res := s.db.Where("id = ? AND user_id = ?", id, userID).Delete(&models.JournalEntry{})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return apierror.ErrNotFound
	}
	return nil
}

// Stats 給趨勢用：各應對姿態次數、最近 30 天篇數、平均挖掘深度。
func (s *JournalService) Stats(userID uint) (map[string]any, error) {
	var byCoping []struct {
		Coping string
		N      int
	}
	if err := s.db.Model(&models.JournalEntry{}).
		Select("COALESCE(coping,'') AS coping, count(*) AS n").
		Where("user_id = ?", userID).Group("coping").Scan(&byCoping).Error; err != nil {
		return nil, err
	}
	var total, recent int64
	s.db.Model(&models.JournalEntry{}).Where("user_id = ?", userID).Count(&total)
	s.db.Model(&models.JournalEntry{}).
		Where("user_id = ? AND occurred_at >= ?", userID, time.Now().AddDate(0, 0, -30)).Count(&recent)

	counts := map[string]int{}
	for _, r := range byCoping {
		if r.Coping != "" {
			counts[r.Coping] = r.N
		}
	}
	return map[string]any{
		"total": total, "last30Days": recent, "byCoping": counts,
	}, nil
}

// ── helpers ──────────────────────────────────────────────

func validateUpsert(req *dto.UpsertJournalEntryRequest) error {
	if strings.TrimSpace(req.Title) == "" {
		return fmt.Errorf("%w: 標題不可為空", apierror.ErrBadRequest)
	}
	if req.Coping != nil && *req.Coping != "" && !models.ValidCopingStances[*req.Coping] {
		return fmt.Errorf("%w: 不合法的應對姿態 %q", apierror.ErrBadRequest, *req.Coping)
	}
	if req.Mood != nil && (*req.Mood < 1 || *req.Mood > 5) {
		return fmt.Errorf("%w: mood 必須是 1–5", apierror.ErrBadRequest)
	}
	return nil
}

// depthFilled 八層裡填了幾層——用來看「這篇挖到多深」，
// 對照文章 280 的重點：多數人停在感受那層就不往下了。
func depthFilled(e models.JournalEntry) int {
	n := 0
	for _, f := range []*string{e.Behavior, e.Coping, e.Feeling, e.FeelingAbout,
		e.Viewpoint, e.Expectation, e.Yearning, e.Self} {
		if f != nil && strings.TrimSpace(*f) != "" {
			n++
		}
	}
	return n
}

func excerpt(e models.JournalEntry) string {
	for _, f := range []*string{e.Behavior, e.Feeling, e.Insight} {
		if f != nil && strings.TrimSpace(*f) != "" {
			r := []rune(strings.TrimSpace(*f))
			if len(r) > 80 {
				return string(r[:80]) + "…"
			}
			return string(r)
		}
	}
	return ""
}

func mapJournalDto(e models.JournalEntry) dto.JournalEntryDto {
	return dto.JournalEntryDto{
		ID: e.ID, OccurredAt: e.OccurredAt, Title: e.Title,
		Behavior: e.Behavior, Coping: e.Coping, Feeling: e.Feeling,
		FeelingAbout: e.FeelingAbout, Viewpoint: e.Viewpoint,
		Expectation: e.Expectation, Yearning: e.Yearning, Self: e.Self,
		Insight: e.Insight, NextAction: e.NextAction, Mood: e.Mood, Tags: e.Tags,
		CreatedAt: e.CreatedAt, UpdatedAt: e.UpdatedAt,
	}
}
