package dto

import "time"

type MediaDto struct {
	ID         uint      `json:"id"`
	FileName   string    `json:"fileName"`
	FilePath   string    `json:"filePath"`
	Url        string    `json:"url"`
	FileSize   int64     `json:"fileSize"`
	MimeType   string    `json:"mimeType"`
	UploadedBy uint      `json:"uploadedBy"`
	Uploader   *UserDto  `json:"uploader"`
	CreatedAt  time.Time `json:"createdAt"`
}

type UploadMediaResponse struct {
	ID       uint   `json:"id"`
	FileName string `json:"fileName"`
	Url      string `json:"url"`
	FileSize int64  `json:"fileSize"`
	MimeType string `json:"mimeType"`
}

type MediaQueryParams struct {
	Page     int    `form:"page"`
	PageSize int    `form:"pageSize"`
	MimeType string `form:"mimeType"`
	Search   string `form:"search"`
}

func (q *MediaQueryParams) GetPage() int {
	if q.Page < 1 {
		return 1
	}
	return q.Page
}

func (q *MediaQueryParams) GetPageSize() int {
	if q.PageSize < 1 || q.PageSize > 100 {
		return 20
	}
	return q.PageSize
}
