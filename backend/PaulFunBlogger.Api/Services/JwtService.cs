using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using PaulFunBlogger.Api.Entities;

namespace PaulFunBlogger.Api.Services;

public interface IJwtService
{
    string GenerateAccessToken(User user);
    string GenerateRefreshToken();
    ClaimsPrincipal? ValidateToken(string token);
    int? GetUserIdFromToken(string token);
}

public class JwtService : IJwtService
{
    private readonly IConfiguration _configuration;
    private readonly string _key;
    private readonly string _issuer;
    private readonly string _audience;
    private readonly int _expireMinutes;

    public JwtService(IConfiguration configuration)
    {
        _configuration = configuration;
        _key = _configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key not configured");
        _issuer = _configuration["Jwt:Issuer"] ?? "PaulFunBlogger";
        _audience = _configuration["Jwt:Audience"] ?? "PaulFunBloggerUsers";
        _expireMinutes = int.Parse(_configuration["Jwt:ExpireMinutes"] ?? "60");
    }

    public string GenerateAccessToken(User user)
    {
        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_key));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(ClaimTypes.Name, user.DisplayName),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var token = new JwtSecurityToken(
            issuer: _issuer,
            audience: _audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_expireMinutes),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string GenerateRefreshToken()
    {
        var randomNumber = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomNumber);
        return Convert.ToBase64String(randomNumber);
    }

    public ClaimsPrincipal? ValidateToken(string token)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(_key);

        try
        {
            var principal = tokenHandler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = true,
                ValidIssuer = _issuer,
                ValidateAudience = true,
                ValidAudience = _audience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            }, out _);

            return principal;
        }
        catch
        {
            return null;
        }
    }

    public int? GetUserIdFromToken(string token)
    {
        var principal = ValidateToken(token);
        if (principal is null) return null;

        var userIdClaim = principal.FindFirst(JwtRegisteredClaimNames.Sub)
                          ?? principal.FindFirst(ClaimTypes.NameIdentifier);

        if (userIdClaim is null || !int.TryParse(userIdClaim.Value, out var userId))
            return null;

        return userId;
    }
}
