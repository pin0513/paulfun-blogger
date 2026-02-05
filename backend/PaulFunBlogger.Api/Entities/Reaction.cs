namespace PaulFunBlogger.Api.Entities;

public class Reaction
{
    public int Id { get; set; }
    public int ArticleId { get; set; }
    public int? UserId { get; set; }
    public string? IpAddress { get; set; }
    public string Type { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Article Article { get; set; } = null!;
    public User? User { get; set; }
}
