namespace PaulFunBlogger.Api.Entities;

public class Comment
{
    public int Id { get; set; }
    public int ArticleId { get; set; }
    public int UserId { get; set; }
    public int? ParentId { get; set; }
    public string Content { get; set; } = string.Empty;
    public string Status { get; set; } = "pending";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public Article Article { get; set; } = null!;
    public User User { get; set; } = null!;
    public Comment? Parent { get; set; }
    public ICollection<Comment> Replies { get; set; } = new List<Comment>();
}
