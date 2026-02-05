using System.Security.Claims;
using PaulFunBlogger.Api.Models;
using PaulFunBlogger.Api.Services;

namespace PaulFunBlogger.Api.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Authentication");

        group.MapPost("/login", Login)
            .WithName("Login")
            .WithOpenApi()
            .AllowAnonymous();

        group.MapPost("/register", Register)
            .WithName("Register")
            .WithOpenApi()
            .AllowAnonymous();

        group.MapPost("/refresh", RefreshToken)
            .WithName("RefreshToken")
            .WithOpenApi()
            .AllowAnonymous();

        group.MapGet("/me", GetCurrentUser)
            .WithName("GetCurrentUser")
            .WithOpenApi()
            .RequireAuthorization();
    }

    private static async Task<IResult> Login(LoginRequest request, IAuthService authService)
    {
        var result = await authService.LoginAsync(request);
        return result.Success ? Results.Ok(result) : Results.BadRequest(result);
    }

    private static async Task<IResult> Register(RegisterRequest request, IAuthService authService)
    {
        var result = await authService.RegisterAsync(request);
        return result.Success ? Results.Ok(result) : Results.BadRequest(result);
    }

    private static async Task<IResult> RefreshToken(RefreshTokenRequest request, IAuthService authService)
    {
        var result = await authService.RefreshTokenAsync(request.RefreshToken);
        return result.Success ? Results.Ok(result) : Results.Unauthorized();
    }

    private static async Task<IResult> GetCurrentUser(ClaimsPrincipal user, IAuthService authService)
    {
        var userIdClaim = user.FindFirst(ClaimTypes.NameIdentifier)
                          ?? user.FindFirst("sub");

        if (userIdClaim is null || !int.TryParse(userIdClaim.Value, out var userId))
        {
            return Results.Unauthorized();
        }

        var currentUser = await authService.GetUserByIdAsync(userId);
        if (currentUser is null)
        {
            return Results.NotFound();
        }

        return Results.Ok(ApiResponse<UserDto>.Ok(new UserDto
        {
            Id = currentUser.Id,
            Email = currentUser.Email,
            DisplayName = currentUser.DisplayName,
            Avatar = currentUser.Avatar,
            Role = currentUser.Role
        }));
    }
}
