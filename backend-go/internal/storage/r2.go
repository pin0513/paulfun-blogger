package storage

import (
	"context"
	"fmt"
	"io"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// R2Storage 使用 Cloudflare R2（S3 相容）儲存檔案。
type R2Storage struct {
	client    *s3.Client
	bucket    string
	publicURL string // 公開存取的 URL prefix，例如 "https://img.paulfun.net"
}

func NewR2Storage(accountID, accessKeyID, secretAccessKey, bucket, publicURL string) *R2Storage {
	endpoint := fmt.Sprintf("https://%s.r2.cloudflarestorage.com", accountID)

	client := s3.New(s3.Options{
		Region:      "auto",
		BaseEndpoint: aws.String(endpoint),
		Credentials: credentials.NewStaticCredentialsProvider(accessKeyID, secretAccessKey, ""),
	})

	return &R2Storage{
		client:    client,
		bucket:    bucket,
		publicURL: publicURL,
	}
}

func (s *R2Storage) Upload(ctx context.Context, key string, reader io.Reader, contentType string) (string, error) {
	input := &s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(key),
		Body:        reader,
		ContentType: aws.String(contentType),
	}

	if _, err := s.client.PutObject(ctx, input); err != nil {
		return "", fmt.Errorf("R2 上傳失敗: %w", err)
	}

	return s.URL(key), nil
}

func (s *R2Storage) Delete(ctx context.Context, key string) error {
	input := &s3.DeleteObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	}

	if _, err := s.client.DeleteObject(ctx, input); err != nil {
		return fmt.Errorf("R2 刪除失敗: %w", err)
	}
	return nil
}

func (s *R2Storage) URL(key string) string {
	return fmt.Sprintf("%s/%s", s.publicURL, key)
}
