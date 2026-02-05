namespace PaulFunBlogger.Api.Entities;

public class Tag
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<Article> Articles { get; set; } = new List<Article>();
}
