package dto

// CreateCategoryRequest POST /api/admin/categories
//
//   - name: 必填
//   - slug: 選填，空字串時自動由 name 產生
//   - parentId: 選填，nil 表示頂層分類
//   - sortOrder: 選填，0 時自動排到最後
type CreateCategoryRequest struct {
	Name      string `json:"name" binding:"required,max=100"`
	Slug      string `json:"slug" binding:"omitempty,max=100"`
	ParentID  *uint  `json:"parentId"`
	SortOrder int    `json:"sortOrder"`
}

// UpdateCategoryRequest PUT /api/admin/categories/:id
//
// 採全欄位替換語義：client 應先 GET 再 PUT 完整物件。
//   - name, slug: 皆必填（避免誤把 not-null 欄位清空）
//   - parentId: 直接替換；nil = 設為頂層
//   - sortOrder: 直接替換
type UpdateCategoryRequest struct {
	Name      string `json:"name" binding:"required,max=100"`
	Slug      string `json:"slug" binding:"required,max=100"`
	ParentID  *uint  `json:"parentId"`
	SortOrder int    `json:"sortOrder"`
}
