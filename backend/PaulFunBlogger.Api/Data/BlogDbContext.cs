using Microsoft.EntityFrameworkCore;
using PaulFunBlogger.Api.Entities;

namespace PaulFunBlogger.Api.Data;

public class BlogDbContext : DbContext
{
    public BlogDbContext(DbContextOptions<BlogDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<Article> Articles => Set<Article>();
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<Reaction> Reactions => Set<Reaction>();
    public DbSet<Media> Media => Set<Media>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Email).HasMaxLength(256).IsRequired();
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.PasswordHash).HasMaxLength(512).IsRequired();
            entity.Property(e => e.DisplayName).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Avatar).HasMaxLength(500);
            entity.Property(e => e.Role).HasMaxLength(20).HasDefaultValue("user");
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
        });

        // Category
        modelBuilder.Entity<Category>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Slug).HasMaxLength(100).IsRequired();
            entity.HasIndex(e => e.Slug).IsUnique();
            entity.Property(e => e.SortOrder).HasDefaultValue(0);
            entity.HasOne(e => e.Parent)
                  .WithMany(e => e.Children)
                  .HasForeignKey(e => e.ParentId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // Tag
        modelBuilder.Entity<Tag>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Slug).HasMaxLength(50).IsRequired();
            entity.HasIndex(e => e.Slug).IsUnique();
        });

        // Article
        modelBuilder.Entity<Article>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Slug).HasMaxLength(200).IsRequired();
            entity.HasIndex(e => e.Slug).IsUnique();
            entity.Property(e => e.Summary).HasMaxLength(500);
            entity.Property(e => e.Content).IsRequired();
            entity.Property(e => e.CoverImage).HasMaxLength(500);
            entity.Property(e => e.Status).HasMaxLength(20).HasDefaultValue("draft");
            entity.Property(e => e.ViewCount).HasDefaultValue(0);
            entity.Property(e => e.Version).HasDefaultValue(1);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");

            entity.HasOne(e => e.Category)
                  .WithMany(e => e.Articles)
                  .HasForeignKey(e => e.CategoryId)
                  .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.Author)
                  .WithMany(e => e.Articles)
                  .HasForeignKey(e => e.AuthorId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasMany(e => e.Tags)
                  .WithMany(e => e.Articles)
                  .UsingEntity<Dictionary<string, object>>(
                      "ArticleTags",
                      j => j.HasOne<Tag>().WithMany().HasForeignKey("TagId").OnDelete(DeleteBehavior.Cascade),
                      j => j.HasOne<Article>().WithMany().HasForeignKey("ArticleId").OnDelete(DeleteBehavior.Cascade));
        });

        // Comment
        modelBuilder.Entity<Comment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Content).HasMaxLength(2000).IsRequired();
            entity.Property(e => e.Status).HasMaxLength(20).HasDefaultValue("pending");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");

            entity.HasOne(e => e.Article)
                  .WithMany(e => e.Comments)
                  .HasForeignKey(e => e.ArticleId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                  .WithMany(e => e.Comments)
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Parent)
                  .WithMany(e => e.Replies)
                  .HasForeignKey(e => e.ParentId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // Reaction
        modelBuilder.Entity<Reaction>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.IpAddress).HasMaxLength(45);
            entity.Property(e => e.Type).HasMaxLength(10).IsRequired();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");

            entity.HasOne(e => e.Article)
                  .WithMany(e => e.Reactions)
                  .HasForeignKey(e => e.ArticleId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.User)
                  .WithMany()
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.SetNull);
        });

        // Media
        modelBuilder.Entity<Media>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.FileName).HasMaxLength(255).IsRequired();
            entity.Property(e => e.FilePath).HasMaxLength(500).IsRequired();
            entity.Property(e => e.MimeType).HasMaxLength(100).IsRequired();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("GETUTCDATE()");

            entity.HasOne(e => e.Uploader)
                  .WithMany(e => e.MediaFiles)
                  .HasForeignKey(e => e.UploadedBy)
                  .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
