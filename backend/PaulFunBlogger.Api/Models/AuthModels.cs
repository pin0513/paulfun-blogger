using System.ComponentModel.DataAnnotations;

namespace PaulFunBlogger.Api.Models;

public record LoginRequest
{
    [Required(ErrorMessage = "Email 為必填")]
    [EmailAddress(ErrorMessage = "Email 格式不正確")]
    public string Email { get; init; } = string.Empty;

    [Required(ErrorMessage = "密碼為必填")]
    public string Password { get; init; } = string.Empty;
}

public record RegisterRequest
{
    [Required(ErrorMessage = "Email 為必填")]
    [EmailAddress(ErrorMessage = "Email 格式不正確")]
    public string Email { get; init; } = string.Empty;

    [Required(ErrorMessage = "密碼為必填")]
    [MinLength(6, ErrorMessage = "密碼至少 6 個字元")]
    public string Password { get; init; } = string.Empty;

    [Required(ErrorMessage = "顯示名稱為必填")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "顯示名稱長度需在 2-100 字元")]
    public string DisplayName { get; init; } = string.Empty;
}

public record AuthResponse
{
    public string Token { get; init; } = string.Empty;
    public string RefreshToken { get; init; } = string.Empty;
    public UserDto User { get; init; } = null!;
}

public record UserDto
{
    public int Id { get; init; }
    public string Email { get; init; } = string.Empty;
    public string DisplayName { get; init; } = string.Empty;
    public string? Avatar { get; init; }
    public string Role { get; init; } = string.Empty;
}

public record RefreshTokenRequest
{
    [Required]
    public string RefreshToken { get; init; } = string.Empty;
}
