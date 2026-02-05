namespace PaulFunBlogger.Api.Entities;

public class User
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? Avatar { get; set; }
    public string Role { get; set; } = "user";
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public ICollection<Article> Articles { get; set; } = new List<Article>();
    public ICollection<Comment> Comments { get; set; } = new List<Comment>();
    public ICollection<Media> MediaFiles { get; set; } = new List<Media>();
}
