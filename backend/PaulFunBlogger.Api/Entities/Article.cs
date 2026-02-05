namespace PaulFunBlogger.Api.Entities;

public class Article
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Summary { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? CoverImage { get; set; }
    public int? CategoryId { get; set; }
    public int AuthorId { get; set; }
    public string Status { get; set; } = "draft";
    public DateTime? PublishedAt { get; set; }
    public int ViewCount { get; set; }
    public int Version { get; set; } = 1;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public Category? Category { get; set; }
    public User Author { get; set; } = null!;
    public ICollection<Tag> Tags { get; set; } = new List<Tag>();
    public ICollection<Comment> Comments { get; set; } = new List<Comment>();
    public ICollection<Reaction> Reactions { get; set; } = new List<Reaction>();
}
