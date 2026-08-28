package models

import "time"

// JournalEntry 自我覺察日記（薩提爾冰山）。
//
// 這是**私人資料**，設計上的三條不變量：
//  1. 所有查詢一律 scope 到 UserID，不存在跨使用者讀取的路徑。
//  2. 沒有任何公開端點；日記永遠不出現在 /api/articles/* 底下。
//  3. SAT-issued JWT 一律拒絕（token 可能外流，私人日記不該被它讀到）。
type JournalEntry struct {
	ID         uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID     uint      `gorm:"not null;index" json:"userId"`
	OccurredAt time.Time `gorm:"not null;index" json:"occurredAt"`
	Title      string    `gorm:"not null;size:200" json:"title"`

	// ── 冰山八層（水面上 → 水面下）──────────────────────
	Behavior     *string `gorm:"type:text" json:"behavior"`     // 行為／事件：只寫事實，不加形容詞
	Coping       *string `gorm:"size:20" json:"coping"`         // 應對姿態
	Feeling      *string `gorm:"type:text" json:"feeling"`      // 感受
	FeelingAbout *string `gorm:"type:text" json:"feelingAbout"` // 感受的感受
	Viewpoint    *string `gorm:"type:text" json:"viewpoint"`    // 觀點／信念
	Expectation  *string `gorm:"type:text" json:"expectation"`  // 期待
	Yearning     *string `gorm:"type:text" json:"yearning"`     // 渴望
	Self         *string `gorm:"type:text" json:"self"`         // 自我／生命力

	// ── 收尾（把覺察轉成可執行的東西）──────────────────
	Insight    *string `gorm:"type:text" json:"insight"`    // 我覺察到什麼
	NextAction *string `gorm:"type:text" json:"nextAction"` // 下次可以怎麼做
	Mood       *int    `json:"mood"`                        // 1–5
	Tags       *string `gorm:"size:300" json:"tags"`        // csv

	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt *time.Time `json:"updatedAt"`
}

// 應對姿態（薩提爾五種）
const (
	CopingPlacating       = "placating"       // 討好
	CopingBlaming         = "blaming"         // 指責
	CopingSuperReasonable = "superReasonable" // 超理智
	CopingIrrelevant      = "irrelevant"      // 打岔
	CopingCongruent       = "congruent"       // 一致
)

// ValidCopingStances 白名單，service 層驗證用。
var ValidCopingStances = map[string]bool{
	CopingPlacating: true, CopingBlaming: true, CopingSuperReasonable: true,
	CopingIrrelevant: true, CopingCongruent: true,
}
