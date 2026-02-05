using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PaulFunBlogger.Api.Data;
using PaulFunBlogger.Api.Models;
using PaulFunBlogger.Api.Services;

namespace PaulFunBlogger.Api.Endpoints;

public static class ArticleEndpoints
{
    public static void MapArticleEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/articles").WithTags("Articles");

        group.MapGet("/", GetArticles)
            .WithName("GetArticles")
            .WithOpenApi();

        group.MapGet("/{slug}", GetArticleBySlug)
            .WithName("GetArticleBySlug")
            .WithOpenApi();

        group.MapGet("/categories", GetCategories)
            .WithName("GetCategories")
            .WithOpenApi();

        group.MapGet("/tags", GetTags)
            .WithName("GetTags")
            .WithOpenApi();
    }

    private static async Task<IResult> GetArticles(
        [AsParameters] ArticleQueryParams query,
        IArticleService articleService)
    {
        var result = await articleService.GetArticlesAsync(query, includeUnpublished: false);
        return Results.Ok(ApiResponse<PagedResponse<ArticleListItemDto>>.Ok(result));
    }

    private static async Task<IResult> GetArticleBySlug(
        string slug,
        IArticleService articleService)
    {
        var article = await articleService.GetArticleBySlugAsync(slug);
        if (article is null)
        {
            return Results.NotFound(ApiResponse<ArticleDto>.Fail("文章不存在"));
        }

        // Increment view count (fire and forget)
        _ = articleService.IncrementViewCountAsync(article.Id);

        return Results.Ok(ApiResponse<ArticleDto>.Ok(article));
    }

    private static async Task<IResult> GetCategories(BlogDbContext context)
    {
        var categories = await context.Categories
            .OrderBy(c => c.SortOrder)
            .ThenBy(c => c.Name)
            .Select(c => new CategoryDto
            {
                Id = c.Id,
                Name = c.Name,
                Slug = c.Slug,
                ParentId = c.ParentId,
                SortOrder = c.SortOrder
            })
            .ToListAsync();

        return Results.Ok(ApiResponse<IEnumerable<CategoryDto>>.Ok(categories));
    }

    private static async Task<IResult> GetTags(BlogDbContext context)
    {
        var tags = await context.Tags
            .OrderBy(t => t.Name)
            .Select(t => new TagDto
            {
                Id = t.Id,
                Name = t.Name,
                Slug = t.Slug
            })
            .ToListAsync();

        return Results.Ok(ApiResponse<IEnumerable<TagDto>>.Ok(tags));
    }
}
