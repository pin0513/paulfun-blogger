namespace PaulFunBlogger.Api.Models;

public record MediaDto
{
    public int Id { get; init; }
    public string FileName { get; init; } = string.Empty;
    public string FilePath { get; init; } = string.Empty;
    public string Url { get; init; } = string.Empty;
    public long FileSize { get; init; }
    public string MimeType { get; init; } = string.Empty;
    public int UploadedBy { get; init; }
    public UserDto? Uploader { get; init; }
    public DateTime CreatedAt { get; init; }
}

public record MediaQueryParams
{
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
    public string? MimeType { get; init; }
    public string? Search { get; init; }
}

public record UploadMediaResponse
{
    public int Id { get; init; }
    public string FileName { get; init; } = string.Empty;
    public string Url { get; init; } = string.Empty;
    public long FileSize { get; init; }
    public string MimeType { get; init; } = string.Empty;
}
