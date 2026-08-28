package dto

import "time"

type JournalEntryDto struct {
	ID           uint       `json:"id"`
	OccurredAt   time.Time  `json:"occurredAt"`
	Title        string     `json:"title"`
	Behavior     *string    `json:"behavior"`
	Coping       *string    `json:"coping"`
	Feeling      *string    `json:"feeling"`
	FeelingAbout *string    `json:"feelingAbout"`
	Viewpoint    *string    `json:"viewpoint"`
	Expectation  *string    `json:"expectation"`
	Yearning     *string    `json:"yearning"`
	Self         *string    `json:"self"`
	Insight      *string    `json:"insight"`
	NextAction   *string    `json:"nextAction"`
	Mood         *int       `json:"mood"`
	Tags         *string    `json:"tags"`
	CreatedAt    time.Time  `json:"createdAt"`
	UpdatedAt    *time.Time `json:"updatedAt"`
}

// JournalEntryListItemDto 列表用：不回完整內文，只給足以辨識的欄位。
type JournalEntryListItemDto struct {
	ID         uint      `json:"id"`
	OccurredAt time.Time `json:"occurredAt"`
	Title      string    `json:"title"`
	Coping     *string   `json:"coping"`
	Mood       *int      `json:"mood"`
	Tags       *string   `json:"tags"`
	Excerpt    string    `json:"excerpt"` // 取行為或感受開頭
	// 已填幾層／共八層，用來看「這篇挖到多深」
	DepthFilled int `json:"depthFilled"`
}

type UpsertJournalEntryRequest struct {
	OccurredAt   *time.Time `json:"occurredAt"`
	Title        string     `json:"title" binding:"required"`
	Behavior     *string    `json:"behavior"`
	Coping       *string    `json:"coping"`
	Feeling      *string    `json:"feeling"`
	FeelingAbout *string    `json:"feelingAbout"`
	Viewpoint    *string    `json:"viewpoint"`
	Expectation  *string    `json:"expectation"`
	Yearning     *string    `json:"yearning"`
	Self         *string    `json:"self"`
	Insight      *string    `json:"insight"`
	NextAction   *string    `json:"nextAction"`
	Mood         *int       `json:"mood"`
	Tags         *string    `json:"tags"`
}

type JournalQueryParams struct {
	Page     int    `form:"page"`
	PageSize int    `form:"pageSize"`
	Search   string `form:"search"`
	Coping   string `form:"coping"`
	DateFrom string `form:"dateFrom"`
	DateTo   string `form:"dateTo"`
}
