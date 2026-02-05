using Microsoft.EntityFrameworkCore;
using PaulFunBlogger.Api.Data;
using PaulFunBlogger.Api.Entities;
using PaulFunBlogger.Api.Models;

namespace PaulFunBlogger.Api.Services;

public interface IMediaService
{
    Task<PagedResponse<MediaDto>> GetMediaAsync(MediaQueryParams query);
    Task<MediaDto?> GetMediaByIdAsync(int id);
    Task<ApiResponse<UploadMediaResponse>> UploadAsync(IFormFile file, int userId);
    Task<ApiResponse<bool>> DeleteAsync(int id, int userId);
}

public class MediaService : IMediaService
{
    private readonly BlogDbContext _context;
    private readonly IWebHostEnvironment _environment;
    private readonly IConfiguration _configuration;

    private static readonly HashSet<string> AllowedMimeTypes = new()
    {
        "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"
    };

    private const long MaxFileSize = 5 * 1024 * 1024; // 5MB

    public MediaService(
        BlogDbContext context,
        IWebHostEnvironment environment,
        IConfiguration configuration)
    {
        _context = context;
        _environment = environment;
        _configuration = configuration;
    }

    public async Task<PagedResponse<MediaDto>> GetMediaAsync(MediaQueryParams query)
    {
        var mediaQuery = _context.Media
            .Include(m => m.Uploader)
            .AsQueryable();

        // Filter by mime type
        if (!string.IsNullOrEmpty(query.MimeType))
        {
            mediaQuery = mediaQuery.Where(m => m.MimeType.StartsWith(query.MimeType));
        }

        // Search by filename
        if (!string.IsNullOrEmpty(query.Search))
        {
            var search = query.Search.ToLower();
            mediaQuery = mediaQuery.Where(m => m.FileName.ToLower().Contains(search));
        }

        var totalCount = await mediaQuery.CountAsync();

        var media = await mediaQuery
            .OrderByDescending(m => m.CreatedAt)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .Select(m => MapToDto(m, GetBaseUrl()))
            .ToListAsync();

        return new PagedResponse<MediaDto>
        {
            Items = media,
            TotalCount = totalCount,
            Page = query.Page,
            PageSize = query.PageSize
        };
    }

    public async Task<MediaDto?> GetMediaByIdAsync(int id)
    {
        var media = await _context.Media
            .Include(m => m.Uploader)
            .FirstOrDefaultAsync(m => m.Id == id);

        return media is null ? null : MapToDto(media, GetBaseUrl());
    }

    public async Task<ApiResponse<UploadMediaResponse>> UploadAsync(IFormFile file, int userId)
    {
        // Validate file
        if (file is null || file.Length == 0)
        {
            return ApiResponse<UploadMediaResponse>.Fail("請選擇檔案");
        }

        if (file.Length > MaxFileSize)
        {
            return ApiResponse<UploadMediaResponse>.Fail("檔案大小不能超過 5MB");
        }

        if (!AllowedMimeTypes.Contains(file.ContentType.ToLower()))
        {
            return ApiResponse<UploadMediaResponse>.Fail("不支援的檔案格式，僅允許 JPEG, PNG, GIF, WebP, SVG");
        }

        // Generate unique filename
        var extension = Path.GetExtension(file.FileName);
        var uniqueFileName = $"{Guid.NewGuid():N}{extension}";
        var year = DateTime.UtcNow.Year.ToString();
        var month = DateTime.UtcNow.Month.ToString("D2");

        // Create directory structure: uploads/2024/01/
        var relativePath = Path.Combine("uploads", year, month);
        var absolutePath = Path.Combine(_environment.ContentRootPath, relativePath);

        if (!Directory.Exists(absolutePath))
        {
            Directory.CreateDirectory(absolutePath);
        }

        var filePath = Path.Combine(relativePath, uniqueFileName);
        var fullPath = Path.Combine(_environment.ContentRootPath, filePath);

        // Save file
        await using (var stream = new FileStream(fullPath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        // Save to database
        var media = new Media
        {
            FileName = file.FileName,
            FilePath = filePath.Replace("\\", "/"),
            FileSize = file.Length,
            MimeType = file.ContentType,
            UploadedBy = userId,
            CreatedAt = DateTime.UtcNow
        };

        _context.Media.Add(media);
        await _context.SaveChangesAsync();

        var baseUrl = GetBaseUrl();

        return ApiResponse<UploadMediaResponse>.Ok(new UploadMediaResponse
        {
            Id = media.Id,
            FileName = media.FileName,
            Url = $"{baseUrl}/{media.FilePath}",
            FileSize = media.FileSize,
            MimeType = media.MimeType
        }, "上傳成功");
    }

    public async Task<ApiResponse<bool>> DeleteAsync(int id, int userId)
    {
        var media = await _context.Media.FindAsync(id);

        if (media is null)
        {
            return ApiResponse<bool>.Fail("檔案不存在");
        }

        // Check permission
        var user = await _context.Users.FindAsync(userId);
        if (user is null || (media.UploadedBy != userId && user.Role != "admin"))
        {
            return ApiResponse<bool>.Fail("沒有權限刪除此檔案");
        }

        // Delete physical file
        var fullPath = Path.Combine(_environment.ContentRootPath, media.FilePath);
        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
        }

        // Delete from database
        _context.Media.Remove(media);
        await _context.SaveChangesAsync();

        return ApiResponse<bool>.Ok(true, "刪除成功");
    }

    private string GetBaseUrl()
    {
        return _configuration["AppSettings:BaseUrl"] ?? "http://localhost:5000";
    }

    private static MediaDto MapToDto(Media media, string baseUrl) => new()
    {
        Id = media.Id,
        FileName = media.FileName,
        FilePath = media.FilePath,
        Url = $"{baseUrl}/{media.FilePath}",
        FileSize = media.FileSize,
        MimeType = media.MimeType,
        UploadedBy = media.UploadedBy,
        Uploader = media.Uploader is null ? null : new UserDto
        {
            Id = media.Uploader.Id,
            Email = media.Uploader.Email,
            DisplayName = media.Uploader.DisplayName,
            Avatar = media.Uploader.Avatar,
            Role = media.Uploader.Role
        },
        CreatedAt = media.CreatedAt
    };
}
