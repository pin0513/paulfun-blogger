// Package markdown 把文章的 HTML 內容轉成 AI 可讀的 Markdown，並計算閱讀時間。
package markdown

import (
	"math"
	"regexp"
	"unicode"
)

// 中日韓字元的閱讀速率（字/分鐘）。取一般中文閱讀 300–400 字/分的中位。
const cjkPerMinute = 350.0

// 其餘語言以「詞」計，取一般英文閱讀 200–250 詞/分的中位。
// 中文與英文不能用同一把尺：440 個英文詞約 2600 個字元，
// 若當字元算會估成八分鐘，差了四倍。
const wordsPerMinute = 220.0

var tagPattern = regexp.MustCompile(`<[^>]*>`)

// ReadingMinutes 由文章的 HTML 內容估算閱讀時間（分鐘），最少 1 分鐘。
func ReadingMinutes(html string) int {
	text := tagPattern.ReplaceAllString(html, " ")

	cjk := 0
	nonCJKWords := 0
	inWord := false
	for _, r := range text {
		switch {
		case isCJK(r):
			cjk++
			inWord = false
		case unicode.IsLetter(r) || unicode.IsDigit(r):
			if !inWord {
				nonCJKWords++
				inWord = true
			}
		default:
			inWord = false
		}
	}

	minutes := int(math.Ceil(float64(cjk)/cjkPerMinute + float64(nonCJKWords)/wordsPerMinute))
	if minutes < 1 {
		return 1
	}
	return minutes
}

func isCJK(r rune) bool {
	return unicode.Is(unicode.Han, r) ||
		unicode.Is(unicode.Hiragana, r) ||
		unicode.Is(unicode.Katakana, r) ||
		unicode.Is(unicode.Hangul, r)
}
