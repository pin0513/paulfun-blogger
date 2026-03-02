package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type visitor struct {
	count    int
	resetAt  time.Time
}

// RateLimiter 基於 IP 的速率限制器
type RateLimiter struct {
	visitors sync.Map
	max      int
	window   time.Duration
}

// NewRateLimiter 建立速率限制器，max 為時間窗口內最大請求數
func NewRateLimiter(max int, window time.Duration) *RateLimiter {
	rl := &RateLimiter{max: max, window: window}
	go rl.cleanup()
	return rl
}

// Limit 回傳 Gin middleware
func (rl *RateLimiter) Limit() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		now := time.Now()

		val, _ := rl.visitors.LoadOrStore(ip, &visitor{count: 0, resetAt: now.Add(rl.window)})
		v := val.(*visitor)

		if now.After(v.resetAt) {
			v.count = 0
			v.resetAt = now.Add(rl.window)
		}

		v.count++
		if v.count > rl.max {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"success": false,
				"message": "請求過於頻繁，請稍後再試",
				"data":    nil,
			})
			return
		}

		c.Next()
	}
}

func (rl *RateLimiter) cleanup() {
	for {
		time.Sleep(5 * time.Minute)
		now := time.Now()
		rl.visitors.Range(func(key, value any) bool {
			v := value.(*visitor)
			if now.After(v.resetAt) {
				rl.visitors.Delete(key)
			}
			return true
		})
	}
}
