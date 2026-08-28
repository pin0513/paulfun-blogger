package dto

import "time"

// JournalEntryDto 冰山各層對外一律是字串陣列（DB 內以 JSON 存）。
type JournalEntryDto struct {
	EntryDate   string     `json:"entryDate"`
	Behavior    []string   `json:"behavior"`
	Feeling     []string   `json:"feeling"`
	Meta        []string   `json:"meta"`
	View        []string   `json:"view"`
	ExpectSelf  []string   `json:"expectSelf"`
	ExpectOther []string   `json:"expectOther"`
	ExpectFrom  []string   `json:"expectFrom"`
	Values      []string   `json:"values"`
	Note        string     `json:"note"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   *time.Time `json:"updatedAt"`
}

// JournalDayDto 月曆用：只回「這天有沒有寫、寫了多少」，不回內容。
type JournalDayDto struct {
	EntryDate   string   `json:"entryDate"`
	DepthFilled int      `json:"depthFilled"` // 八層裡有填的層數
	ItemCount   int      `json:"itemCount"`   // 總共選了幾個選項
	HasNote     bool     `json:"hasNote"`
	Preview     []string `json:"preview"` // 前幾個選項，月曆 hover 用
}

type UpsertJournalEntryRequest struct {
	Behavior    []string `json:"behavior"`
	Feeling     []string `json:"feeling"`
	Meta        []string `json:"meta"`
	View        []string `json:"view"`
	ExpectSelf  []string `json:"expectSelf"`
	ExpectOther []string `json:"expectOther"`
	ExpectFrom  []string `json:"expectFrom"`
	Values      []string `json:"values"`
	Note        string   `json:"note"`
}

type JournalRangeParams struct {
	From string `form:"from"` // YYYY-MM-DD
	To   string `form:"to"`
}

// JournalStatsDto 長期趨勢：哪些選項最常出現，是這個工具最有價值的產出。
type JournalStatsDto struct {
	TotalDays     int                     `json:"totalDays"`
	Last30Days    int                     `json:"last30Days"`
	CurrentStreak int                     `json:"currentStreak"`
	TopByField    map[string][]ValueTally `json:"topByField"`
}

type ValueTally struct {
	Value string `json:"value"`
	Count int    `json:"count"`
}
