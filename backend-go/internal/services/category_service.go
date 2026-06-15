package services

import (
	"errors"
	"fmt"

	"github.com/paulhuang/paulfun-blogger/internal/apierror"
	"github.com/paulhuang/paulfun-blogger/internal/dto"
	"github.com/paulhuang/paulfun-blogger/internal/models"
	"gorm.io/gorm"
)

// UncategorizedSlug 是「未分類」固定分類的 slug。
// 啟動時 auto-seed，不可刪除、不可改 name/slug。
// DELETE 任何分類時，該分類下的文章會被 reassign 到此處。
const (
	UncategorizedSlug = "uncategorized"
	UncategorizedName = "未分類"
)

type CategoryService struct {
	db *gorm.DB
}

func NewCategoryService(db *gorm.DB) *CategoryService {
	return &CategoryService{db: db}
}

// EnsureUncategorized 啟動時呼叫，確保「未分類」分類存在。
func (s *CategoryService) EnsureUncategorized() error {
	var cat models.Category
	err := s.db.Where("slug = ?", UncategorizedSlug).First(&cat).Error
	if err == nil {
		return nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}
	cat = models.Category{
		Name:      UncategorizedName,
		Slug:      UncategorizedSlug,
		SortOrder: 9999, // 排到最後
	}
	return s.db.Create(&cat).Error
}

// Create 建立新分類。
func (s *CategoryService) Create(req dto.CreateCategoryRequest) (*dto.CategoryDto, error) {
	slug := req.Slug
	if slug == "" {
		slug = generateSlug(req.Name)
	}

	if exists, err := s.slugExists(slug, 0); err != nil {
		return nil, err
	} else if exists {
		return nil, fmt.Errorf("%w: slug %q 已被使用", apierror.ErrConflict, slug)
	}

	if req.ParentID != nil {
		if err := s.checkParentExists(*req.ParentID); err != nil {
			return nil, err
		}
	}

	cat := models.Category{
		Name:      req.Name,
		Slug:      slug,
		ParentID:  req.ParentID,
		SortOrder: req.SortOrder,
	}
	if cat.SortOrder == 0 {
		var maxOrder int
		s.db.Model(&models.Category{}).
			Where("slug <> ?", UncategorizedSlug).
			Select("COALESCE(MAX(sort_order), 0)").
			Scan(&maxOrder)
		cat.SortOrder = maxOrder + 1
	}

	if err := s.db.Create(&cat).Error; err != nil {
		return nil, fmt.Errorf("建立分類失敗: %w", err)
	}
	return mapCategoryToDto(cat), nil
}

// Update 更新分類（全欄位替換語義）。
func (s *CategoryService) Update(id uint, req dto.UpdateCategoryRequest) (*dto.CategoryDto, error) {
	var cat models.Category
	if err := s.db.First(&cat, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apierror.ErrNotFound
		}
		return nil, err
	}

	// 保護「未分類」：不可改 name 或 slug
	if cat.Slug == UncategorizedSlug {
		if req.Slug != cat.Slug || req.Name != cat.Name {
			return nil, fmt.Errorf("%w: 不可修改「未分類」分類的 name 或 slug", apierror.ErrForbidden)
		}
	}

	// slug 改了 → 檢查唯一（排除自己）
	if req.Slug != cat.Slug {
		if exists, err := s.slugExists(req.Slug, id); err != nil {
			return nil, err
		} else if exists {
			return nil, fmt.Errorf("%w: slug %q 已被使用", apierror.ErrConflict, req.Slug)
		}
	}

	if req.ParentID != nil {
		if *req.ParentID == id {
			return nil, fmt.Errorf("%w: parentId 不可指向自己", apierror.ErrBadRequest)
		}
		if err := s.checkParentExists(*req.ParentID); err != nil {
			return nil, err
		}
		if err := s.checkNoCycle(id, *req.ParentID); err != nil {
			return nil, err
		}
	}

	cat.Name = req.Name
	cat.Slug = req.Slug
	cat.ParentID = req.ParentID
	cat.SortOrder = req.SortOrder

	if err := s.db.Save(&cat).Error; err != nil {
		return nil, fmt.Errorf("更新分類失敗: %w", err)
	}
	return mapCategoryToDto(cat), nil
}

// Delete 刪除分類；該分類下的文章會被 reassign 到「未分類」，
// 子分類的 parent_id 會被設為 nil。
func (s *CategoryService) Delete(id uint) error {
	var cat models.Category
	if err := s.db.First(&cat, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return apierror.ErrNotFound
		}
		return err
	}

	if cat.Slug == UncategorizedSlug {
		return fmt.Errorf("%w: 「未分類」分類為系統保留，不可刪除", apierror.ErrForbidden)
	}

	var uncat models.Category
	if err := s.db.Where("slug = ?", UncategorizedSlug).First(&uncat).Error; err != nil {
		return fmt.Errorf("找不到「未分類」分類，請確認啟動 seed 是否執行: %w", err)
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.Article{}).
			Where("category_id = ?", id).
			Update("category_id", uncat.ID).Error; err != nil {
			return fmt.Errorf("reassign 文章到未分類失敗: %w", err)
		}
		if err := tx.Model(&models.Category{}).
			Where("parent_id = ?", id).
			Update("parent_id", nil).Error; err != nil {
			return fmt.Errorf("解除子分類 parent 失敗: %w", err)
		}
		if err := tx.Delete(&cat).Error; err != nil {
			return fmt.Errorf("刪除分類失敗: %w", err)
		}
		return nil
	})
}

// ── helpers ─────────────────────────────────────────────

func (s *CategoryService) slugExists(slug string, excludeID uint) (bool, error) {
	var count int64
	q := s.db.Model(&models.Category{}).Where("slug = ?", slug)
	if excludeID > 0 {
		q = q.Where("id <> ?", excludeID)
	}
	if err := q.Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func (s *CategoryService) checkParentExists(parentID uint) error {
	var count int64
	if err := s.db.Model(&models.Category{}).Where("id = ?", parentID).Count(&count).Error; err != nil {
		return err
	}
	if count == 0 {
		return fmt.Errorf("%w: parentId %d 不存在", apierror.ErrBadRequest, parentID)
	}
	return nil
}

// checkNoCycle 確認把 selfID 的 parent 改成 newParentID 後不會形成循環。
// 由 newParentID 往上追，若中途遇到 selfID 就視為循環。
func (s *CategoryService) checkNoCycle(selfID, newParentID uint) error {
	currentID := newParentID
	for i := 0; i < 100; i++ {
		if currentID == selfID {
			return fmt.Errorf("%w: parentId 會形成循環引用", apierror.ErrBadRequest)
		}
		var parent models.Category
		if err := s.db.Select("id, parent_id").Where("id = ?", currentID).First(&parent).Error; err != nil {
			return nil
		}
		if parent.ParentID == nil {
			return nil
		}
		currentID = *parent.ParentID
	}
	return fmt.Errorf("%w: 分類層級過深（>100）", apierror.ErrBadRequest)
}

func mapCategoryToDto(cat models.Category) *dto.CategoryDto {
	return &dto.CategoryDto{
		ID:        cat.ID,
		Name:      cat.Name,
		Slug:      cat.Slug,
		ParentID:  cat.ParentID,
		SortOrder: cat.SortOrder,
	}
}
