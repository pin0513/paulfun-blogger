using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using PaulFunBlogger.Api.Data;
using PaulFunBlogger.Api.Entities;
using PaulFunBlogger.Api.Models;

namespace PaulFunBlogger.Api.Services;

public interface IArticleService
{
    Task<PagedResponse<ArticleListItemDto>> GetArticlesAsync(ArticleQueryParams query, bool includeUnpublished = false);
    Task<ArticleDto?> GetArticleByIdAsync(int id);
    Task<ArticleDto?> GetArticleBySlugAsync(string slug);
    Task<ApiResponse<ArticleDto>> CreateArticleAsync(CreateArticleRequest request, int authorId);
    Task<ApiResponse<ArticleDto>> UpdateArticleAsync(int id, UpdateArticleRequest request, int userId);
    Task<ApiResponse<bool>> DeleteArticleAsync(int id, int userId);
    Task<ApiResponse<ArticleDto>> PublishArticleAsync(int id, PublishArticleRequest? request, int userId);
    Task<ApiResponse<ArticleDto>> UnpublishArticleAsync(int id, int userId);
    Task IncrementViewCountAsync(int id);
}

public class ArticleService : IArticleService
{
    private readonly BlogDbContext _context;

    public ArticleService(BlogDbContext context)
    {
        _context = context;
    }

    public async Task<PagedResponse<ArticleListItemDto>> GetArticlesAsync(ArticleQueryParams query, bool includeUnpublished = false)
    {
        var articlesQuery = _context.Articles
            .Include(a => a.Author)
            .Include(a => a.Category)
            .Include(a => a.Tags)
            .AsQueryable();

        // Filter by status
        if (!includeUnpublished)
        {
            articlesQuery = articlesQuery.Where(a => a.Status == "published" && a.PublishedAt <= DateTime.UtcNow);
        }
        else if (!string.IsNullOrEmpty(query.Status))
        {
            articlesQuery = articlesQuery.Where(a => a.Status == query.Status);
        }

        // Filter by category
        if (query.CategoryId.HasValue)
        {
            articlesQuery = articlesQuery.Where(a => a.CategoryId == query.CategoryId);
        }

        // Filter by tag
        if (query.TagId.HasValue)
        {
            articlesQuery = articlesQuery.Where(a => a.Tags.Any(t => t.Id == query.TagId));
        }

        // Search
        if (!string.IsNullOrEmpty(query.Search))
        {
            var search = query.Search.ToLower();
            articlesQuery = articlesQuery.Where(a =>
                a.Title.ToLower().Contains(search) ||
                (a.Summary != null && a.Summary.ToLower().Contains(search)));
        }

        // Total count
        var totalCount = await articlesQuery.CountAsync();

        // Sorting
        var sortBy = query.GetSortBy().ToLower();
        var descending = query.GetDescending();
        articlesQuery = sortBy switch
        {
            "title" => descending ? articlesQuery.OrderByDescending(a => a.Title) : articlesQuery.OrderBy(a => a.Title),
            "publishedat" => descending ? articlesQuery.OrderByDescending(a => a.PublishedAt) : articlesQuery.OrderBy(a => a.PublishedAt),
            "viewcount" => descending ? articlesQuery.OrderByDescending(a => a.ViewCount) : articlesQuery.OrderBy(a => a.ViewCount),
            _ => descending ? articlesQuery.OrderByDescending(a => a.CreatedAt) : articlesQuery.OrderBy(a => a.CreatedAt)
        };

        // Paging
        var page = query.GetPage();
        var pageSize = query.GetPageSize();
        var articles = await articlesQuery
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => MapToListItemDto(a))
            .ToListAsync();

        return new PagedResponse<ArticleListItemDto>
        {
            Items = articles,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<ArticleDto?> GetArticleByIdAsync(int id)
    {
        var article = await _context.Articles
            .Include(a => a.Author)
            .Include(a => a.Category)
            .Include(a => a.Tags)
            .FirstOrDefaultAsync(a => a.Id == id);

        return article is null ? null : MapToDto(article);
    }

    public async Task<ArticleDto?> GetArticleBySlugAsync(string slug)
    {
        var article = await _context.Articles
            .Include(a => a.Author)
            .Include(a => a.Category)
            .Include(a => a.Tags)
            .FirstOrDefaultAsync(a => a.Slug == slug && a.Status == "published" && a.PublishedAt <= DateTime.UtcNow);

        return article is null ? null : MapToDto(article);
    }

    public async Task<ApiResponse<ArticleDto>> CreateArticleAsync(CreateArticleRequest request, int authorId)
    {
        var slug = GenerateSlug(request.Title);

        // Ensure unique slug
        var baseSlug = slug;
        var counter = 1;
        while (await _context.Articles.AnyAsync(a => a.Slug == slug))
        {
            slug = $"{baseSlug}-{counter++}";
        }

        var article = new Article
        {
            Title = request.Title,
            Slug = slug,
            Summary = request.Summary,
            Content = request.Content,
            CoverImage = request.CoverImage,
            CategoryId = request.CategoryId,
            AuthorId = authorId,
            Status = "draft",
            CreatedAt = DateTime.UtcNow
        };

        // Add tags
        if (request.TagIds.Any())
        {
            var tags = await _context.Tags.Where(t => request.TagIds.Contains(t.Id)).ToListAsync();
            article.Tags = tags;
        }

        _context.Articles.Add(article);
        await _context.SaveChangesAsync();

        // Reload with includes
        await _context.Entry(article).Reference(a => a.Author).LoadAsync();
        await _context.Entry(article).Reference(a => a.Category).LoadAsync();

        return ApiResponse<ArticleDto>.Ok(MapToDto(article), "文章建立成功");
    }

    public async Task<ApiResponse<ArticleDto>> UpdateArticleAsync(int id, UpdateArticleRequest request, int userId)
    {
        var article = await _context.Articles
            .Include(a => a.Tags)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (article is null)
        {
            return ApiResponse<ArticleDto>.Fail("文章不存在");
        }

        // Check permission (author or admin)
        var user = await _context.Users.FindAsync(userId);
        if (user is null || (article.AuthorId != userId && user.Role != "admin"))
        {
            return ApiResponse<ArticleDto>.Fail("沒有權限修改此文章");
        }

        article.Title = request.Title;
        article.Summary = request.Summary;
        article.Content = request.Content;
        article.CoverImage = request.CoverImage;
        article.CategoryId = request.CategoryId;
        article.UpdatedAt = DateTime.UtcNow;
        article.Version++;

        // Update tags
        article.Tags.Clear();
        if (request.TagIds.Any())
        {
            var tags = await _context.Tags.Where(t => request.TagIds.Contains(t.Id)).ToListAsync();
            foreach (var tag in tags)
            {
                article.Tags.Add(tag);
            }
        }

        await _context.SaveChangesAsync();

        // Reload with includes
        await _context.Entry(article).Reference(a => a.Author).LoadAsync();
        await _context.Entry(article).Reference(a => a.Category).LoadAsync();

        return ApiResponse<ArticleDto>.Ok(MapToDto(article), "文章更新成功");
    }

    public async Task<ApiResponse<bool>> DeleteArticleAsync(int id, int userId)
    {
        var article = await _context.Articles.FindAsync(id);

        if (article is null)
        {
            return ApiResponse<bool>.Fail("文章不存在");
        }

        var user = await _context.Users.FindAsync(userId);
        if (user is null || (article.AuthorId != userId && user.Role != "admin"))
        {
            return ApiResponse<bool>.Fail("沒有權限刪除此文章");
        }

        _context.Articles.Remove(article);
        await _context.SaveChangesAsync();

        return ApiResponse<bool>.Ok(true, "文章刪除成功");
    }

    public async Task<ApiResponse<ArticleDto>> PublishArticleAsync(int id, PublishArticleRequest? request, int userId)
    {
        var article = await _context.Articles
            .Include(a => a.Author)
            .Include(a => a.Category)
            .Include(a => a.Tags)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (article is null)
        {
            return ApiResponse<ArticleDto>.Fail("文章不存在");
        }

        var user = await _context.Users.FindAsync(userId);
        if (user is null || (article.AuthorId != userId && user.Role != "admin"))
        {
            return ApiResponse<ArticleDto>.Fail("沒有權限發佈此文章");
        }

        if (request?.ScheduledAt.HasValue == true)
        {
            article.Status = "scheduled";
            article.PublishedAt = request.ScheduledAt;
        }
        else
        {
            article.Status = "published";
            article.PublishedAt = DateTime.UtcNow;
        }

        article.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return ApiResponse<ArticleDto>.Ok(MapToDto(article), "文章發佈成功");
    }

    public async Task<ApiResponse<ArticleDto>> UnpublishArticleAsync(int id, int userId)
    {
        var article = await _context.Articles
            .Include(a => a.Author)
            .Include(a => a.Category)
            .Include(a => a.Tags)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (article is null)
        {
            return ApiResponse<ArticleDto>.Fail("文章不存在");
        }

        var user = await _context.Users.FindAsync(userId);
        if (user is null || (article.AuthorId != userId && user.Role != "admin"))
        {
            return ApiResponse<ArticleDto>.Fail("沒有權限取消發佈此文章");
        }

        article.Status = "draft";
        article.PublishedAt = null;
        article.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return ApiResponse<ArticleDto>.Ok(MapToDto(article), "文章已取消發佈");
    }

    public async Task IncrementViewCountAsync(int id)
    {
        await _context.Articles
            .Where(a => a.Id == id)
            .ExecuteUpdateAsync(s => s.SetProperty(a => a.ViewCount, a => a.ViewCount + 1));
    }

    private static string GenerateSlug(string title)
    {
        var slug = title.ToLower().Trim();
        slug = Regex.Replace(slug, @"[^\w\u4e00-\u9fff\s-]", "");
        slug = Regex.Replace(slug, @"\s+", "-");
        slug = Regex.Replace(slug, @"-+", "-");
        slug = slug.Trim('-');

        if (string.IsNullOrEmpty(slug))
        {
            slug = Guid.NewGuid().ToString("N")[..8];
        }

        return slug;
    }

    private static ArticleDto MapToDto(Article article) => new()
    {
        Id = article.Id,
        Title = article.Title,
        Slug = article.Slug,
        Summary = article.Summary,
        Content = article.Content,
        CoverImage = article.CoverImage,
        CategoryId = article.CategoryId,
        Category = article.Category is null ? null : new CategoryDto
        {
            Id = article.Category.Id,
            Name = article.Category.Name,
            Slug = article.Category.Slug,
            ParentId = article.Category.ParentId,
            SortOrder = article.Category.SortOrder
        },
        AuthorId = article.AuthorId,
        Author = new UserDto
        {
            Id = article.Author.Id,
            Email = article.Author.Email,
            DisplayName = article.Author.DisplayName,
            Avatar = article.Author.Avatar,
            Role = article.Author.Role
        },
        Status = article.Status,
        PublishedAt = article.PublishedAt,
        ViewCount = article.ViewCount,
        Tags = article.Tags.Select(t => new TagDto
        {
            Id = t.Id,
            Name = t.Name,
            Slug = t.Slug
        }),
        CreatedAt = article.CreatedAt,
        UpdatedAt = article.UpdatedAt
    };

    private static ArticleListItemDto MapToListItemDto(Article article) => new()
    {
        Id = article.Id,
        Title = article.Title,
        Slug = article.Slug,
        Summary = article.Summary,
        CoverImage = article.CoverImage,
        Category = article.Category is null ? null : new CategoryDto
        {
            Id = article.Category.Id,
            Name = article.Category.Name,
            Slug = article.Category.Slug,
            ParentId = article.Category.ParentId,
            SortOrder = article.Category.SortOrder
        },
        Author = new UserDto
        {
            Id = article.Author.Id,
            Email = article.Author.Email,
            DisplayName = article.Author.DisplayName,
            Avatar = article.Author.Avatar,
            Role = article.Author.Role
        },
        Status = article.Status,
        PublishedAt = article.PublishedAt,
        ViewCount = article.ViewCount,
        Tags = article.Tags.Select(t => new TagDto
        {
            Id = t.Id,
            Name = t.Name,
            Slug = t.Slug
        })
    };
}
