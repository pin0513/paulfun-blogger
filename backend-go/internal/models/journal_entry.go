package models

import "time"

// JournalEntry 自我覺察日記（薩提爾冰山），一位使用者一天一篇。
//
// 這是**私人資料**，設計上的三條不變量：
//  1. 所有查詢一律 scope 到 UserID，不存在跨使用者讀取的路徑。
//  2. 沒有任何公開端點；日記永遠不出現在 /api/articles/* 底下。
//  3. SAT-issued JWT 一律拒絕（token 可能外流，私人日記不該被它讀到）。
//
// 冰山各層存的是「選項字串陣列」的 JSON（設計稿是 chip 多選而非自由書寫），
// 以 TEXT 存放而不另開關聯表：讀寫永遠是整篇一起、不需要對單一選項下查詢，
// 開一張 entry_values 表只會換來每次讀取都要 join 的成本。
type JournalEntry struct {
	ID     uint `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID uint `gorm:"not null;index;uniqueIndex:uq_journal_user_date" json:"userId"`
	// EntryDate 用 YYYY-MM-DD 字串而非 time：日記是「哪一天」的概念，
	// 存 timestamp 會引入時區換算，跨時區時同一天可能被算成兩天。
	EntryDate string `gorm:"not null;size:10;index;uniqueIndex:uq_journal_user_date" json:"entryDate"`

	// ── 冰山八層（水面上 → 水面下），各為 JSON string array ──
	Behavior    string `gorm:"type:text;default:'[]'" json:"-"` // 行為
	Feeling     string `gorm:"type:text;default:'[]'" json:"-"` // 感受
	Meta        string `gorm:"type:text;default:'[]'" json:"-"` // 感受的感受
	View        string `gorm:"type:text;default:'[]'" json:"-"` // 觀點
	ExpectSelf  string `gorm:"type:text;default:'[]'" json:"-"` // 期待 · 對自己
	ExpectOther string `gorm:"type:text;default:'[]'" json:"-"` // 期待 · 對他人
	ExpectFrom  string `gorm:"type:text;default:'[]'" json:"-"` // 期待 · 他人對我的
	Values      string `gorm:"type:text;default:'[]'" json:"-"` // 價值觀 · 渴望

	Note string `gorm:"type:text" json:"note"` // 自由書寫

	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt *time.Time `json:"updatedAt"`
}

// JournalFieldKeys 冰山八層的 key，順序即水面由上往下。
// 與前端 icebergFields.ts 的 FIELDS 順序一致。
var JournalFieldKeys = []string{
	"behavior", "feeling", "meta", "view",
	"expectSelf", "expectOther", "expectFrom", "values",
}

// JournalFavorite 各欄位最近用過的選項，讓常用的浮到前面。
type JournalFavorite struct {
	ID       uint      `gorm:"primaryKey;autoIncrement"`
	UserID   uint      `gorm:"not null;index;uniqueIndex:uq_journal_fav"`
	FieldKey string    `gorm:"not null;size:20;uniqueIndex:uq_journal_fav"`
	Value    string    `gorm:"not null;size:100;uniqueIndex:uq_journal_fav"`
	UsedAt   time.Time `gorm:"not null;index"`
}
