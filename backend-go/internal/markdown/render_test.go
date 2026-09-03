package markdown

import (
	"strings"
	"testing"
	"time"
)

func fixedTime(s string) *time.Time {
	t, err := time.Parse(time.RFC3339, s)
	if err != nil {
		panic(err)
	}
	return &t
}

// front matter 是給 AI 讀的「這是什麼、何時寫的、出處在哪」。
// 期望值是逐字寫出來的字面值，不是用實作的組字邏輯推出來的。
func TestRender_FrontMatterCarriesProvenance(t *testing.T) {
	a := Article{
		ID:          289,
		Title:       "寫了超過50年程式的人",
		ContentHTML: "<p>內文</p>",
		PublishedAt: fixedTime("2026-09-01T00:00:00Z"),
		SiteURL:     "https://paulfun.net",
	}

	got := Render(a)

	want := strings.Join([]string{
		"---",
		`title: "寫了超過50年程式的人"`,
		"published: 2026-09-01",
		"canonical: https://paulfun.net/articles/289",
		"reading_minutes: 1",
		"---",
	}, "\n")

	if !strings.HasPrefix(got, want) {
		t.Errorf("front matter 不符。\n--- 期望開頭 ---\n%s\n--- 實際 ---\n%s", want, got)
	}
}

// 內文要真的變成 Markdown 結構，不是把 HTML 原樣塞進去。
// 期望值是 Markdown 規格本身：h2 是 "## "，段落之間空一行。
func TestRender_ConvertsHeadingsAndParagraphs(t *testing.T) {
	a := Article{
		ID:          1,
		Title:       "t",
		ContentHTML: "<h2>為什麼</h2><p>因為如此。</p>",
		SiteURL:     "https://paulfun.net",
	}

	got := Render(a)

	if !strings.Contains(got, "## 為什麼") {
		t.Errorf("h2 應轉成 '## 為什麼'，實際內容：\n%s", got)
	}
	if !strings.Contains(got, "因為如此。") {
		t.Errorf("段落文字應保留，實際內容：\n%s", got)
	}
	if strings.Contains(got, "<h2>") || strings.Contains(got, "<p>") {
		t.Errorf("不應殘留 HTML 標籤，實際內容：\n%s", got)
	}
}

// 技術文章的程式碼區塊若丟掉語言標記，AI 讀到的就只是一團縮排文字。
// Tiptap 產出的樣式是 <pre><code class="language-go">。
func TestRender_KeepsCodeBlockLanguage(t *testing.T) {
	a := Article{
		ID: 1, Title: "t", SiteURL: "https://paulfun.net",
		ContentHTML: `<pre><code class="language-go">fmt.Println("hi")</code></pre>`,
	}

	got := Render(a)

	if !strings.Contains(got, "```go") {
		t.Errorf("應輸出帶語言的圍欄 ```go，實際內容：\n%s", got)
	}
	if !strings.Contains(got, `fmt.Println("hi")`) {
		t.Errorf("程式碼本身應保留，實際內容：\n%s", got)
	}
}

// Markdown 是被拿去「離開這個網站」讀的 —— 相對路徑在那裡必然壞掉。
//
// 測資取自線上真實資料：掃過 150 篇文章，54 張圖片全都已經是
// https://img.paulfun.net 絕對網址，但有 1 個相對連結（文章 239 裡的
// /articles/192）。圖片那條是防禦性的，連結這條是真的踩得到。
func TestRender_MakesRelativeUrlsAbsolute(t *testing.T) {
	a := Article{
		ID: 239, Title: "t", SiteURL: "https://paulfun.net",
		ContentHTML: `<p>見<a href="/articles/192">前一篇</a></p><p><img src="/uploads/x.png" alt="圖"></p>`,
	}

	got := Render(a)

	if !strings.Contains(got, "https://paulfun.net/articles/192") {
		t.Errorf("相對連結應轉成絕對網址，實際內容：\n%s", got)
	}
	if !strings.Contains(got, "https://paulfun.net/uploads/x.png") {
		t.Errorf("相對圖片路徑應轉成絕對網址，實際內容：\n%s", got)
	}
}

// AI 讀的時候要判斷「這篇多新、屬於什麼、誰寫的」。
// 「最後更新」與版次特別重要 —— 這個 blog 的文章會被修訂，
// 只給發佈日會讓 AI 以為讀到的是舊版。
func TestRender_FrontMatterCarriesTaxonomyAndRevision(t *testing.T) {
	a := Article{
		ID: 1, Title: "t", ContentHTML: "<p>x</p>", SiteURL: "https://paulfun.net",
		Category: "技術", Tags: []string{"Go", "Clean Architecture"},
		Author:      "Paul",
		PublishedAt: fixedTime("2026-09-01T00:00:00Z"),
		UpdatedAt:   fixedTime("2026-09-15T00:00:00Z"),
		Version:     3,
	}

	got := Render(a)

	for _, want := range []string{
		`author: "Paul"`,
		`category: "技術"`,
		`tags: ["Go", "Clean Architecture"]`,
		"updated: 2026-09-15",
		"version: 3",
	} {
		if !strings.Contains(got, want) {
			t.Errorf("front matter 少了 %s，實際內容：\n%s", want, got)
		}
	}
}

// 沒有分類 / 標籤 / 更新日的文章，不該印出空欄位讓 AI 誤讀成「分類是空字串」。
func TestRender_OmitsEmptyFrontMatterFields(t *testing.T) {
	a := Article{ID: 1, Title: "t", ContentHTML: "<p>x</p>", SiteURL: "https://paulfun.net", Version: 1}

	got := Render(a)

	for _, absent := range []string{"category:", "tags:", "updated:", "author:", "version:"} {
		if strings.Contains(got, absent) {
			t.Errorf("沒有值的欄位 %s 不該出現，實際內容：\n%s", absent, got)
		}
	}
}
