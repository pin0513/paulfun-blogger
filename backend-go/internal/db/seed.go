package db

import (
	"log"
	"time"

	"github.com/paulhuang/paulfun-blogger/internal/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func Seed(db *gorm.DB) {
	// 已有資料則略過
	var count int64
	db.Model(&models.User{}).Count(&count)
	if count > 0 {
		return
	}

	log.Println("執行初始 Seed 資料...")

	// ── Admin User（密碼: Test1234）──────────────────────────
	hash, err := bcrypt.GenerateFromPassword([]byte("Test1234"), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("bcrypt hash 失敗: %v", err)
	}

	admin := models.User{
		Email:        "pin0513@gmail.com",
		PasswordHash: string(hash),
		DisplayName:  "Paul",
		Role:         "admin",
		IsActive:     true,
	}
	db.Create(&admin)

	// ── Categories ──────────────────────────────────────────
	categories := []models.Category{
		{Name: "技術", Slug: "tech", SortOrder: 1},
		{Name: "生活", Slug: "life", SortOrder: 2},
		{Name: "旅遊", Slug: "travel", SortOrder: 3},
		{Name: "閱讀", Slug: "reading", SortOrder: 4},
	}
	db.Create(&categories)

	// ── Tags ────────────────────────────────────────────────
	tags := []models.Tag{
		{Name: "C#", Slug: "csharp"},
		{Name: ".NET", Slug: "dotnet"},
		{Name: "React", Slug: "react"},
		{Name: "TypeScript", Slug: "typescript"},
		{Name: "Next.js", Slug: "nextjs"},
		{Name: "隨筆", Slug: "essay"},
		{Name: "Go", Slug: "go"},
	}
	db.Create(&tags)

	// ── Sample Article ──────────────────────────────────────
	now := time.Now().UTC()
	summary := "歡迎來到 PaulFun Blogger，這是我的第一篇文章，記錄這個部落格的誕生。"
	content := `<h2>嗨，歡迎光臨</h2>
<p>這裡是 <strong>PaulFun Blogger</strong>，一個用 Go + Next.js 14 打造的個人部落格。</p>
<h2>為什麼要寫部落格？</h2>
<p>寫部落格是整理思緒最好的方式。把腦中模糊的想法變成文字的過程，本身就是一種學習。</p>
<blockquote><p>「如果你沒辦法簡單地解釋一件事，代表你還不夠了解它。」— Richard Feynman</p></blockquote>
<h2>技術棧</h2>
<ul>
<li><strong>前端</strong>：Next.js 14 (App Router) + TailwindCSS + Tiptap Editor</li>
<li><strong>後端</strong>：Go 1.22 + Gin + GORM</li>
<li><strong>資料庫</strong>：PostgreSQL 16</li>
</ul>
<pre><code>console.log('Hello, Blog!');</code></pre>`

	article := models.Article{
		Title:       "Hello, Blog",
		Slug:        "hello-blog",
		Summary:     &summary,
		Content:     &content,
		CategoryID:  &categories[0].ID,
		AuthorID:    admin.ID,
		Status:      "published",
		PublishedAt: &now,
	}
	db.Create(&article)

	// 關聯 .NET tag 和 Next.js tag
	db.Model(&article).Association("Tags").Append([]models.Tag{tags[1], tags[4]})

	log.Println("Seed 完成：admin + 4 分類 + 7 標籤 + 1 文章")
}
