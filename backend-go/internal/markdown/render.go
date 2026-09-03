package markdown

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	md "github.com/JohannesKaufmann/html-to-markdown"
)

// Article 是產生 Markdown 需要的最小輸入。
//
// 刻意不直接吃 models.Article：那個型別綁著 GORM 與資料庫欄位，
// 讓純函式依賴它的話，這裡的測試就得先有資料庫。
type Article struct {
	ID          uint
	Title       string
	Summary     string
	ContentHTML string
	Category    string
	Tags        []string
	Author      string
	PublishedAt *time.Time
	UpdatedAt   *time.Time
	Version     int
	SiteURL     string // 例：https://paulfun.net
}

// Render 產生一份 AI 可讀的 Markdown 文件：YAML front matter + 內文。
func Render(a Article) string {
	var b strings.Builder
	b.WriteString(frontMatter(a))
	b.WriteString("\n\n")
	b.WriteString(body(a))
	return b.String()
}

// body 把文章的 HTML 轉成 Markdown。
//
// 轉換交給函式庫，這裡只負責我們自己的加工。函式庫的正確性是它的測試責任，
// 我們測的是「加工有沒有做對」——那才是這個專案會出錯的地方。
func body(a Article) string {
	// 在轉換前先把相對路徑補成絕對 —— Markdown 是被拿去離開這個網站讀的，
	// 相對路徑在那裡必然壞掉。實測 150 篇文章，圖片都已經是絕對網址，
	// 但連結還是有相對的（文章 239 的 /articles/192）。
	//
	// 不用函式庫的 domain 參數：它只吃裸網域並硬套 http://，
	// 傳完整 URL 進去會產生 http://https:%2F%2Fpaulfun.net/... 這種東西。
	html := absolutize(a.ContentHTML, strings.TrimRight(a.SiteURL, "/"))

	conv := md.NewConverter("", true, nil)
	out, err := conv.ConvertString(html)
	if err != nil {
		// 轉換失敗不吞成空字串：下游會把「轉換失敗」誤讀成「這篇沒有內容」。
		return fmt.Sprintf("> ⚠️ 內容轉換失敗，請改讀原文：%s/articles/%d\n", strings.TrimRight(a.SiteURL, "/"), a.ID)
	}
	return strings.TrimSpace(out) + "\n"
}

// relativeURLPattern 抓 href/src 裡以單一 "/" 開頭的路徑。
// 刻意不動 "//" 開頭的協定相對網址 —— 那個已經是絕對的，只是沿用當前協定。
var relativeURLPattern = regexp.MustCompile(`(href|src)="(/[^/][^"]*)"`)

func absolutize(html, siteURL string) string {
	if siteURL == "" {
		return html
	}
	return relativeURLPattern.ReplaceAllString(html, `$1="`+siteURL+`$2"`)
}

func frontMatter(a Article) string {
	lines := []string{
		"---",
		fmt.Sprintf("title: %q", a.Title),
	}
	if a.PublishedAt != nil {
		lines = append(lines, "published: "+a.PublishedAt.Format("2006-01-02"))
	}
	// 這個 blog 的文章會被修訂。只給發佈日，AI 會以為讀到的是初版；
	// 版次讓它知道「這篇改過幾輪」。
	if a.UpdatedAt != nil {
		lines = append(lines, "updated: "+a.UpdatedAt.Format("2006-01-02"))
	}
	if a.Version > 1 {
		lines = append(lines, fmt.Sprintf("version: %d", a.Version))
	}
	if a.Author != "" {
		lines = append(lines, fmt.Sprintf("author: %q", a.Author))
	}
	if a.Category != "" {
		lines = append(lines, fmt.Sprintf("category: %q", a.Category))
	}
	if len(a.Tags) > 0 {
		quoted := make([]string, len(a.Tags))
		for i, t := range a.Tags {
			quoted[i] = fmt.Sprintf("%q", t)
		}
		lines = append(lines, "tags: ["+strings.Join(quoted, ", ")+"]")
	}
	lines = append(lines,
		fmt.Sprintf("canonical: %s/articles/%d", strings.TrimRight(a.SiteURL, "/"), a.ID),
		fmt.Sprintf("reading_minutes: %d", ReadingMinutes(a.ContentHTML)),
		"---",
	)
	return strings.Join(lines, "\n")
}
