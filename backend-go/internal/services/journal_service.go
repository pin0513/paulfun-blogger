package services

import (
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/paulhuang/paulfun-blogger/internal/apierror"
	"github.com/paulhuang/paulfun-blogger/internal/dto"
	"github.com/paulhuang/paulfun-blogger/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	maxItemsPerField = 40
	maxItemLen       = 100
	maxNoteLen       = 5000
	favsPerField     = 8
)

// JournalService 自我覺察日記。
//
// 不變量：每個方法都收 userID，且每一句 SQL 都帶 user_id 條件。
// 沒有任何方法能在不指定 userID 的情況下取得資料——刻意如此，
// 讓「忘記 scope」在編譯期就寫不出來。
type JournalService struct {
	db *gorm.DB
}

func NewJournalService(db *gorm.DB) *JournalService {
	return &JournalService{db: db}
}

// ── 讀 ────────────────────────────────────────────────────

// GetDay 取某一天；沒寫過回空白（不是 404）——月曆點任一天都該能開始寫。
func (s *JournalService) GetDay(userID uint, date string) (*dto.JournalEntryDto, error) {
	if !validDate(date) {
		return nil, fmt.Errorf("%w: 日期格式須為 YYYY-MM-DD", apierror.ErrBadRequest)
	}
	var e models.JournalEntry
	err := s.db.Where("user_id = ? AND entry_date = ?", userID, date).First(&e).Error
	if err != nil {
		return &dto.JournalEntryDto{EntryDate: date, Behavior: []string{}, Feeling: []string{},
			Meta: []string{}, View: []string{}, ExpectSelf: []string{}, ExpectOther: []string{},
			ExpectFrom: []string{}, Values: []string{}}, nil
	}
	d := mapJournalDto(e)
	return &d, nil
}

// GetRange 月曆用：回區間內每天的填寫概況，不回內容。
func (s *JournalService) GetRange(userID uint, from, to string) ([]dto.JournalDayDto, error) {
	if from != "" && !validDate(from) || to != "" && !validDate(to) {
		return nil, fmt.Errorf("%w: 日期格式須為 YYYY-MM-DD", apierror.ErrBadRequest)
	}
	q := s.db.Where("user_id = ?", userID)
	if from != "" {
		q = q.Where("entry_date >= ?", from)
	}
	if to != "" {
		q = q.Where("entry_date <= ?", to)
	}
	var rows []models.JournalEntry
	if err := q.Order("entry_date DESC").Limit(400).Find(&rows).Error; err != nil {
		return nil, err
	}
	out := make([]dto.JournalDayDto, 0, len(rows))
	for _, e := range rows {
		vals := allValues(e)
		depth, count, preview := 0, 0, []string{}
		for _, list := range vals {
			if len(list) > 0 {
				depth++
			}
			count += len(list)
			for _, v := range list {
				if len(preview) < 3 {
					preview = append(preview, v)
				}
			}
		}
		out = append(out, dto.JournalDayDto{
			EntryDate: e.EntryDate, DepthFilled: depth, ItemCount: count,
			HasNote: strings.TrimSpace(e.Note) != "", Preview: preview,
		})
	}
	return out, nil
}

// ── 寫 ────────────────────────────────────────────────────

// UpsertDay 一天一篇：有就更新、沒有就建立。全空則刪除該天。
func (s *JournalService) UpsertDay(userID uint, date string, req *dto.UpsertJournalEntryRequest) (*dto.JournalEntryDto, error) {
	if !validDate(date) {
		return nil, fmt.Errorf("%w: 日期格式須為 YYYY-MM-DD", apierror.ErrBadRequest)
	}
	fields := map[string][]string{
		"behavior": req.Behavior, "feeling": req.Feeling, "meta": req.Meta, "view": req.View,
		"expectSelf": req.ExpectSelf, "expectOther": req.ExpectOther,
		"expectFrom": req.ExpectFrom, "values": req.Values,
	}
	for k, v := range fields {
		clean, err := sanitizeList(v)
		if err != nil {
			return nil, fmt.Errorf("%w（%s）", err, k)
		}
		fields[k] = clean
	}
	note := strings.TrimSpace(req.Note)
	if len([]rune(note)) > maxNoteLen {
		return nil, fmt.Errorf("%w: 自由書寫超過 %d 字", apierror.ErrBadRequest, maxNoteLen)
	}

	// 全空 = 使用者把當天內容清光，刪掉而不是留一筆空白
	empty := note == ""
	for _, v := range fields {
		if len(v) > 0 {
			empty = false
		}
	}
	if empty {
		s.db.Where("user_id = ? AND entry_date = ?", userID, date).Delete(&models.JournalEntry{})
		return &dto.JournalEntryDto{EntryDate: date, Behavior: []string{}, Feeling: []string{},
			Meta: []string{}, View: []string{}, ExpectSelf: []string{}, ExpectOther: []string{},
			ExpectFrom: []string{}, Values: []string{}}, nil
	}

	e := models.JournalEntry{
		UserID: userID, EntryDate: date, Note: note,
		Behavior: enc(fields["behavior"]), Feeling: enc(fields["feeling"]),
		Meta: enc(fields["meta"]), View: enc(fields["view"]),
		ExpectSelf: enc(fields["expectSelf"]), ExpectOther: enc(fields["expectOther"]),
		ExpectFrom: enc(fields["expectFrom"]), Values: enc(fields["values"]),
	}
	// ON CONFLICT (user_id, entry_date) — 靠 DB 的 unique index 保證一天一篇，
	// 而不是先 SELECT 再決定 INSERT/UPDATE（那在並發下會產生兩筆）。
	if err := s.db.Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "user_id"}, {Name: "entry_date"}},
		DoUpdates: clause.AssignmentColumns([]string{"behavior", "feeling", "meta", "view",
			"expect_self", "expect_other", "expect_from", "values", "note", "updated_at"}),
	}).Create(&e).Error; err != nil {
		return nil, err
	}

	s.bumpFavorites(userID, fields)

	var saved models.JournalEntry
	if err := s.db.Where("user_id = ? AND entry_date = ?", userID, date).First(&saved).Error; err != nil {
		return nil, err
	}
	d := mapJournalDto(saved)
	return &d, nil
}

func (s *JournalService) DeleteDay(userID uint, date string) error {
	if !validDate(date) {
		return fmt.Errorf("%w: 日期格式須為 YYYY-MM-DD", apierror.ErrBadRequest)
	}
	res := s.db.Where("user_id = ? AND entry_date = ?", userID, date).Delete(&models.JournalEntry{})
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return apierror.ErrNotFound
	}
	return nil
}

// ── 我的最愛 ──────────────────────────────────────────────

func (s *JournalService) bumpFavorites(userID uint, fields map[string][]string) {
	now := time.Now().UTC()
	for k, list := range fields {
		for _, v := range list {
			f := models.JournalFavorite{UserID: userID, FieldKey: k, Value: v, UsedAt: now}
			s.db.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "user_id"}, {Name: "field_key"}, {Name: "value"}},
				DoUpdates: clause.AssignmentColumns([]string{"used_at"}),
			}).Create(&f)
		}
	}
}

// Favorites 各欄位最近用過的前 N 個。
func (s *JournalService) Favorites(userID uint) (map[string][]string, error) {
	var rows []models.JournalFavorite
	if err := s.db.Where("user_id = ?", userID).Order("used_at DESC").
		Limit(len(models.JournalFieldKeys) * favsPerField * 3).Find(&rows).Error; err != nil {
		return nil, err
	}
	out := map[string][]string{}
	for _, r := range rows {
		if len(out[r.FieldKey]) < favsPerField {
			out[r.FieldKey] = append(out[r.FieldKey], r.Value)
		}
	}
	for _, k := range models.JournalFieldKeys {
		if out[k] == nil {
			out[k] = []string{}
		}
	}
	return out, nil
}

// ── 統計 ──────────────────────────────────────────────────

func (s *JournalService) Stats(userID uint) (*dto.JournalStatsDto, error) {
	var rows []models.JournalEntry
	if err := s.db.Where("user_id = ?", userID).Order("entry_date DESC").Find(&rows).Error; err != nil {
		return nil, err
	}
	cutoff := time.Now().AddDate(0, 0, -30).Format("2006-01-02")
	last30 := 0
	tally := map[string]map[string]int{}
	dates := map[string]bool{}
	for _, e := range rows {
		if e.EntryDate >= cutoff {
			last30++
		}
		dates[e.EntryDate] = true
		for k, list := range allValues(e) {
			if tally[k] == nil {
				tally[k] = map[string]int{}
			}
			for _, v := range list {
				tally[k][v]++
			}
		}
	}
	top := map[string][]dto.ValueTally{}
	for _, k := range models.JournalFieldKeys {
		list := make([]dto.ValueTally, 0, len(tally[k]))
		for v, n := range tally[k] {
			list = append(list, dto.ValueTally{Value: v, Count: n})
		}
		sort.Slice(list, func(i, j int) bool {
			if list[i].Count != list[j].Count {
				return list[i].Count > list[j].Count
			}
			return list[i].Value < list[j].Value
		})
		if len(list) > 5 {
			list = list[:5]
		}
		top[k] = list
	}
	// 連續天數：從今天往回數，斷了就停
	streak := 0
	for d := time.Now(); ; d = d.AddDate(0, 0, -1) {
		if !dates[d.Format("2006-01-02")] {
			// 今天還沒寫不算斷，從昨天開始算
			if streak == 0 && d.Format("2006-01-02") == time.Now().Format("2006-01-02") {
				continue
			}
			break
		}
		streak++
		if streak > 3650 {
			break
		}
	}
	return &dto.JournalStatsDto{
		TotalDays: len(dates), Last30Days: last30,
		CurrentStreak: streak, TopByField: top,
	}, nil
}

// ExportMarkdown 匯出全部日記為 Markdown。
func (s *JournalService) ExportMarkdown(userID uint) (string, error) {
	var rows []models.JournalEntry
	if err := s.db.Where("user_id = ?", userID).Order("entry_date DESC").Find(&rows).Error; err != nil {
		return "", err
	}
	labels := map[string]string{
		"behavior": "行為", "feeling": "感受", "meta": "感受的感受", "view": "觀點",
		"expectSelf": "期待 · 對自己", "expectOther": "期待 · 對他人",
		"expectFrom": "期待 · 他人對我的", "values": "價值觀 · 渴望",
	}
	var b strings.Builder
	b.WriteString("# 自我覺察日記\n\n")
	fmt.Fprintf(&b, "共 %d 天　匯出於 %s\n\n", len(rows), time.Now().Format("2006-01-02"))
	for _, e := range rows {
		fmt.Fprintf(&b, "## %s\n\n", e.EntryDate)
		vals := allValues(e)
		for _, k := range models.JournalFieldKeys {
			if len(vals[k]) == 0 {
				continue
			}
			fmt.Fprintf(&b, "**%s**：%s\n\n", labels[k], strings.Join(vals[k], "、"))
		}
		if strings.TrimSpace(e.Note) != "" {
			fmt.Fprintf(&b, "> %s\n\n", strings.ReplaceAll(e.Note, "\n", "\n> "))
		}
		b.WriteString("---\n\n")
	}
	return b.String(), nil
}

// ── helpers ──────────────────────────────────────────────

func validDate(d string) bool {
	if len(d) != 10 {
		return false
	}
	_, err := time.Parse("2006-01-02", d)
	return err == nil
}

// sanitizeList 去空白、去重、擋過長與過多，避免前端或手動 API 塞爆欄位。
func sanitizeList(in []string) ([]string, error) {
	if len(in) > maxItemsPerField {
		return nil, fmt.Errorf("%w: 單一欄位最多 %d 項", apierror.ErrBadRequest, maxItemsPerField)
	}
	seen := map[string]bool{}
	out := make([]string, 0, len(in))
	for _, v := range in {
		v = strings.TrimSpace(v)
		if v == "" || seen[v] {
			continue
		}
		if len([]rune(v)) > maxItemLen {
			return nil, fmt.Errorf("%w: 單項最多 %d 字", apierror.ErrBadRequest, maxItemLen)
		}
		seen[v] = true
		out = append(out, v)
	}
	return out, nil
}

func enc(v []string) string {
	if v == nil {
		v = []string{}
	}
	b, err := json.Marshal(v)
	if err != nil {
		return "[]"
	}
	return string(b)
}

func dec(s string) []string {
	var out []string
	if s == "" {
		return []string{}
	}
	if err := json.Unmarshal([]byte(s), &out); err != nil || out == nil {
		return []string{}
	}
	return out
}

func allValues(e models.JournalEntry) map[string][]string {
	return map[string][]string{
		"behavior": dec(e.Behavior), "feeling": dec(e.Feeling), "meta": dec(e.Meta),
		"view": dec(e.View), "expectSelf": dec(e.ExpectSelf),
		"expectOther": dec(e.ExpectOther), "expectFrom": dec(e.ExpectFrom),
		"values": dec(e.Values),
	}
}

func mapJournalDto(e models.JournalEntry) dto.JournalEntryDto {
	v := allValues(e)
	return dto.JournalEntryDto{
		EntryDate: e.EntryDate,
		Behavior:  v["behavior"], Feeling: v["feeling"], Meta: v["meta"], View: v["view"],
		ExpectSelf: v["expectSelf"], ExpectOther: v["expectOther"],
		ExpectFrom: v["expectFrom"], Values: v["values"],
		Note: e.Note, CreatedAt: e.CreatedAt, UpdatedAt: e.UpdatedAt,
	}
}
