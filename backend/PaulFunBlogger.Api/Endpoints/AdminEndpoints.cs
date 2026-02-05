using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using PaulFunBlogger.Api.Models;
using PaulFunBlogger.Api.Services;

namespace PaulFunBlogger.Api.Endpoints;

public static class AdminEndpoints
{
    public static void MapAdminEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin")
            .WithTags("Admin")
            .RequireAuthorization();

        // Articles
        group.MapGet("/articles", GetArticles)
            .WithName("AdminGetArticles")
            .WithOpenApi();

        group.MapGet("/articles/{id:int}", GetArticle)
            .WithName("AdminGetArticle")
            .WithOpenApi();

        group.MapPost("/articles", CreateArticle)
            .WithName("AdminCreateArticle")
            .WithOpenApi();

        group.MapPut("/articles/{id:int}", UpdateArticle)
            .WithName("AdminUpdateArticle")
            .WithOpenApi();

        group.MapDelete("/articles/{id:int}", DeleteArticle)
            .WithName("AdminDeleteArticle")
            .WithOpenApi();

        group.MapPost("/articles/{id:int}/publish", PublishArticle)
            .WithName("AdminPublishArticle")
            .WithOpenApi();

        group.MapPost("/articles/{id:int}/unpublish", UnpublishArticle)
            .WithName("AdminUnpublishArticle")
            .WithOpenApi();
    }

    private static async Task<IResult> GetArticles(
        [AsParameters] ArticleQueryParams query,
        IArticleService articleService)
    {
        var result = await articleService.GetArticlesAsync(query, includeUnpublished: true);
        return Results.Ok(ApiResponse<PagedResponse<ArticleListItemDto>>.Ok(result));
    }

    private static async Task<IResult> GetArticle(int id, IArticleService articleService)
    {
        var article = await articleService.GetArticleByIdAsync(id);
        if (article is null)
        {
            return Results.NotFound(ApiResponse<ArticleDto>.Fail("文章不存在"));
        }
        return Results.Ok(ApiResponse<ArticleDto>.Ok(article));
    }

    private static async Task<IResult> CreateArticle(
        CreateArticleRequest request,
        ClaimsPrincipal user,
        IArticleService articleService)
    {
        var userId = GetUserId(user);
        if (userId is null)
        {
            return Results.Unauthorized();
        }

        var result = await articleService.CreateArticleAsync(request, userId.Value);
        return result.Success ? Results.Ok(result) : Results.BadRequest(result);
    }

    private static async Task<IResult> UpdateArticle(
        int id,
        UpdateArticleRequest request,
        ClaimsPrincipal user,
        IArticleService articleService)
    {
        var userId = GetUserId(user);
        if (userId is null)
        {
            return Results.Unauthorized();
        }

        var result = await articleService.UpdateArticleAsync(id, request, userId.Value);
        return result.Success ? Results.Ok(result) : Results.BadRequest(result);
    }

    private static async Task<IResult> DeleteArticle(
        int id,
        ClaimsPrincipal user,
        IArticleService articleService)
    {
        var userId = GetUserId(user);
        if (userId is null)
        {
            return Results.Unauthorized();
        }

        var result = await articleService.DeleteArticleAsync(id, userId.Value);
        return result.Success ? Results.Ok(result) : Results.BadRequest(result);
    }

    private static async Task<IResult> PublishArticle(
        int id,
        PublishArticleRequest? request,
        ClaimsPrincipal user,
        IArticleService articleService)
    {
        var userId = GetUserId(user);
        if (userId is null)
        {
            return Results.Unauthorized();
        }

        var result = await articleService.PublishArticleAsync(id, request, userId.Value);
        return result.Success ? Results.Ok(result) : Results.BadRequest(result);
    }

    private static async Task<IResult> UnpublishArticle(
        int id,
        ClaimsPrincipal user,
        IArticleService articleService)
    {
        var userId = GetUserId(user);
        if (userId is null)
        {
            return Results.Unauthorized();
        }

        var result = await articleService.UnpublishArticleAsync(id, userId.Value);
        return result.Success ? Results.Ok(result) : Results.BadRequest(result);
    }

    private static int? GetUserId(ClaimsPrincipal user)
    {
        var userIdClaim = user.FindFirst(ClaimTypes.NameIdentifier)
                          ?? user.FindFirst("sub");

        if (userIdClaim is null || !int.TryParse(userIdClaim.Value, out var userId))
        {
            return null;
        }

        return userId;
    }
}
