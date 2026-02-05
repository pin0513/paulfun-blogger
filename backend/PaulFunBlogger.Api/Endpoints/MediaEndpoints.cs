using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using PaulFunBlogger.Api.Models;
using PaulFunBlogger.Api.Services;

namespace PaulFunBlogger.Api.Endpoints;

public static class MediaEndpoints
{
    public static void MapMediaEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin/media")
            .WithTags("Media")
            .RequireAuthorization();

        group.MapGet("/", GetMedia)
            .WithName("GetMedia")
            .WithOpenApi();

        group.MapGet("/{id:int}", GetMediaById)
            .WithName("GetMediaById")
            .WithOpenApi();

        group.MapPost("/upload", UploadMedia)
            .WithName("UploadMedia")
            .WithOpenApi()
            .DisableAntiforgery();

        group.MapDelete("/{id:int}", DeleteMedia)
            .WithName("DeleteMedia")
            .WithOpenApi();
    }

    private static async Task<IResult> GetMedia(
        [AsParameters] MediaQueryParams query,
        IMediaService mediaService)
    {
        var result = await mediaService.GetMediaAsync(query);
        return Results.Ok(ApiResponse<PagedResponse<MediaDto>>.Ok(result));
    }

    private static async Task<IResult> GetMediaById(int id, IMediaService mediaService)
    {
        var media = await mediaService.GetMediaByIdAsync(id);
        if (media is null)
        {
            return Results.NotFound(ApiResponse<MediaDto>.Fail("檔案不存在"));
        }
        return Results.Ok(ApiResponse<MediaDto>.Ok(media));
    }

    private static async Task<IResult> UploadMedia(
        IFormFile file,
        ClaimsPrincipal user,
        IMediaService mediaService)
    {
        var userId = GetUserId(user);
        if (userId is null)
        {
            return Results.Unauthorized();
        }

        var result = await mediaService.UploadAsync(file, userId.Value);
        return result.Success ? Results.Ok(result) : Results.BadRequest(result);
    }

    private static async Task<IResult> DeleteMedia(
        int id,
        ClaimsPrincipal user,
        IMediaService mediaService)
    {
        var userId = GetUserId(user);
        if (userId is null)
        {
            return Results.Unauthorized();
        }

        var result = await mediaService.DeleteAsync(id, userId.Value);
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
