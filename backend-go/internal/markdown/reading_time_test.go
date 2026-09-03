package markdown

import "testing"

// 閱讀時間的規格（獨立於實作的真相源）：
//   中日韓字元 350 字/分鐘、其餘語言 220 詞/分鐘，兩者相加後無條件進位，最少 1 分鐘。
//   速率取自一般中文閱讀 300–400 字/分、英文 200–250 詞/分的常見區間中位。
//
// 這裡的期望值是「手算出來的整數」，不是用跟實作相同的算式推出來的 ——
// 700 = 350 × 2，所以答案必然是 2。實作若改了速率，這條就會紅。
func TestReadingMinutes_ChineseAtThreeFiftyPerMinute(t *testing.T) {
	// 700 個中文字 = 剛好兩分鐘
	html := "<p>" + repeat("測", 700) + "</p>"

	got := ReadingMinutes(html)

	if got != 2 {
		t.Errorf("700 個中文字應為 2 分鐘（350 字/分），得到 %d", got)
	}
}

func repeat(s string, n int) string {
	out := make([]rune, 0, n)
	r := []rune(s)[0]
	for i := 0; i < n; i++ {
		out = append(out, r)
	}
	return string(out)
}

// 440 = 220 × 2，所以答案必然是 2。這條逼出「非 CJK 語言要用詞數而不是字元數」——
// 440 個英文詞若被當成字元算會是約 2600 字元，答案會變成 8，這條就會紅。
func TestReadingMinutes_EnglishAtTwoTwentyWordsPerMinute(t *testing.T) {
	words := ""
	for i := 0; i < 440; i++ {
		words += "word "
	}

	got := ReadingMinutes("<p>" + words + "</p>")

	if got != 2 {
		t.Errorf("440 個英文詞應為 2 分鐘（220 詞/分），得到 %d", got)
	}
}
