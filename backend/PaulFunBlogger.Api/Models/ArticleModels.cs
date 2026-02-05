using System.ComponentModel.DataAnnotations;

namespace PaulFunBlogger.Api.Models;

// Article DTOs
public record ArticleDto
{
    public int Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Slug { get; init; } = string.Empty;
    public string? Summary { get; init; }
    public string Content { get; init; } = string.Empty;
    public string? CoverImage { get; init; }
    public int? CategoryId { get; init; }
    public CategoryDto? Category { get; init; }
    public int AuthorId { get; init; }
    public UserDto Author { get; init; } = null!;
    public string Status { get; init; } = string.Empty;
    public DateTime? PublishedAt { get; init; }
    public int ViewCount { get; init; }
    public IEnumerable<TagDto> Tags { get; init; } = Enumerable.Empty<TagDto>();
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
}

public record ArticleListItemDto
{
    public int Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Slug { get; init; } = string.Empty;
    public string? Summary { get; init; }
    public string? CoverImage { get; init; }
    public CategoryDto? Category { get; init; }
    public UserDto Author { get; init; } = null!;
    public string Status { get; init; } = string.Empty;
    public DateTime? PublishedAt { get; init; }
    public int ViewCount { get; init; }
    public IEnumerable<TagDto> Tags { get; init; } = Enumerable.Empty<TagDto>();
}

public record CreateArticleRequest
{
    [Required(ErrorMessage = "標題為必填")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "標題長度需在 1-200 字元")]
    public string Title { get; init; } = string.Empty;

    [StringLength(500, ErrorMessage = "摘要最多 500 字元")]
    public string? Summary { get; init; }

    [Required(ErrorMessage = "內容為必填")]
    public string Content { get; init; } = string.Empty;

    public string? CoverImage { get; init; }
    public int? CategoryId { get; init; }
    public IEnumerable<int> TagIds { get; init; } = Enumerable.Empty<int>();
}

public record UpdateArticleRequest
{
    [Required(ErrorMessage = "標題為必填")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "標題長度需在 1-200 字元")]
    public string Title { get; init; } = string.Empty;

    [StringLength(500, ErrorMessage = "摘要最多 500 字元")]
    public string? Summary { get; init; }

    [Required(ErrorMessage = "內容為必填")]
    public string Content { get; init; } = string.Empty;

    public string? CoverImage { get; init; }
    public int? CategoryId { get; init; }
    public IEnumerable<int> TagIds { get; init; } = Enumerable.Empty<int>();
}

public record PublishArticleRequest
{
    public DateTime? ScheduledAt { get; init; }
}

// Category DTOs
public record CategoryDto
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Slug { get; init; } = string.Empty;
    public int? ParentId { get; init; }
    public int SortOrder { get; init; }
}

// Tag DTOs
public record TagDto
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Slug { get; init; } = string.Empty;
}

public record CreateTagRequest
{
    [Required(ErrorMessage = "標籤名稱為必填")]
    [StringLength(50, MinimumLength = 1, ErrorMessage = "標籤名稱長度需在 1-50 字元")]
    public string Name { get; init; } = string.Empty;
}

// Query Parameters
public class ArticleQueryParams
{
    public int? Page { get; set; }
    public int? PageSize { get; set; }
    public string? Status { get; set; }
    public int? CategoryId { get; set; }
    public int? TagId { get; set; }
    public string? Search { get; set; }
    public string? SortBy { get; set; }
    public bool? Descending { get; set; }

    public int GetPage() => Page ?? 1;
    public int GetPageSize() => Math.Clamp(PageSize ?? 10, 1, 50);
    public string GetSortBy() => SortBy ?? "CreatedAt";
    public bool GetDescending() => Descending ?? true;
}
