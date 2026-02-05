using Microsoft.EntityFrameworkCore;
using PaulFunBlogger.Api.Data;
using PaulFunBlogger.Api.Entities;
using PaulFunBlogger.Api.Models;

namespace PaulFunBlogger.Api.Services;

public interface IAuthService
{
    Task<ApiResponse<AuthResponse>> LoginAsync(LoginRequest request);
    Task<ApiResponse<AuthResponse>> RegisterAsync(RegisterRequest request);
    Task<ApiResponse<AuthResponse>> RefreshTokenAsync(string refreshToken);
    Task<User?> GetUserByIdAsync(int userId);
}

public class AuthService : IAuthService
{
    private readonly BlogDbContext _context;
    private readonly IJwtService _jwtService;

    public AuthService(BlogDbContext context, IJwtService jwtService)
    {
        _context = context;
        _jwtService = jwtService;
    }

    public async Task<ApiResponse<AuthResponse>> LoginAsync(LoginRequest request)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == request.Email && u.IsActive);

        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return ApiResponse<AuthResponse>.Fail("帳號或密碼錯誤");
        }

        var accessToken = _jwtService.GenerateAccessToken(user);
        var refreshToken = _jwtService.GenerateRefreshToken();

        // TODO: 儲存 refresh token 到資料庫或快取

        return ApiResponse<AuthResponse>.Ok(new AuthResponse
        {
            Token = accessToken,
            RefreshToken = refreshToken,
            User = MapToUserDto(user)
        });
    }

    public async Task<ApiResponse<AuthResponse>> RegisterAsync(RegisterRequest request)
    {
        // 檢查 Email 是否已存在
        if (await _context.Users.AnyAsync(u => u.Email == request.Email))
        {
            return ApiResponse<AuthResponse>.Fail("此 Email 已被註冊");
        }

        var user = new User
        {
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            DisplayName = request.DisplayName,
            Role = "user",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var accessToken = _jwtService.GenerateAccessToken(user);
        var refreshToken = _jwtService.GenerateRefreshToken();

        return ApiResponse<AuthResponse>.Ok(new AuthResponse
        {
            Token = accessToken,
            RefreshToken = refreshToken,
            User = MapToUserDto(user)
        }, "註冊成功");
    }

    public async Task<ApiResponse<AuthResponse>> RefreshTokenAsync(string refreshToken)
    {
        // TODO: 從資料庫或快取驗證 refresh token
        // 簡化版：暫不實作 refresh token 驗證

        return ApiResponse<AuthResponse>.Fail("Refresh token 無效或已過期");
    }

    public async Task<User?> GetUserByIdAsync(int userId)
    {
        return await _context.Users.FindAsync(userId);
    }

    private static UserDto MapToUserDto(User user) => new()
    {
        Id = user.Id,
        Email = user.Email,
        DisplayName = user.DisplayName,
        Avatar = user.Avatar,
        Role = user.Role
    };
}
