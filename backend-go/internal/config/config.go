package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string

	JWTSecret      string
	JWTExpireHours int

	Port      string
	BaseURL   string
	UploadDir string

	// Storage 設定
	StorageType      string // "local" | "r2"
	R2AccountID      string
	R2AccessKeyID    string
	R2SecretAccessKey string
	R2Bucket         string
	R2PublicURL      string
}

func Load() *Config {
	// .env 不存在時略過（允許使用環境變數）
	_ = godotenv.Load()

	expireHours, _ := strconv.Atoi(getEnv("JWT_EXPIRE_HOURS", "24"))

	return &Config{
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5433"),
		DBUser:     getEnv("DB_USER", "postgres"),
		DBPassword: getEnv("DB_PASSWORD", "YourStrong!Passw0rd"),
		DBName:     getEnv("DB_NAME", "paulfun_blogger"),
		DBSSLMode:  getEnv("DB_SSLMODE", "disable"),

		JWTSecret:      getEnv("JWT_SECRET", "default-secret-change-in-production"),
		JWTExpireHours: expireHours,

		Port:      getEnv("PORT", "8080"),
		BaseURL:   getEnv("BASE_URL", "http://localhost:5266"),
		UploadDir: getEnv("UPLOAD_DIR", "./uploads"),

		StorageType:      getEnv("STORAGE_TYPE", "local"),
		R2AccountID:      getEnv("R2_ACCOUNT_ID", ""),
		R2AccessKeyID:    getEnv("R2_ACCESS_KEY_ID", ""),
		R2SecretAccessKey: getEnv("R2_SECRET_ACCESS_KEY", ""),
		R2Bucket:         getEnv("R2_BUCKET", "paulfun-images"),
		R2PublicURL:      getEnv("R2_PUBLIC_URL", ""),
	}
}

func (c *Config) DSN() string {
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s TimeZone=UTC",
		c.DBHost, c.DBPort, c.DBUser, c.DBPassword, c.DBName, c.DBSSLMode,
	)
}

func getEnv(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}
