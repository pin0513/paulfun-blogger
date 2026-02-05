using Microsoft.EntityFrameworkCore;
using PaulFunBlogger.Api.Entities;

namespace PaulFunBlogger.Api.Data.Seeds;

public static class SeedData
{
    public static async Task InitializeAsync(BlogDbContext context)
    {
        if (await context.Users.AnyAsync())
        {
            return;
        }

        // Seed Admin User (password: Test1234)
        var adminUser = new User
        {
            Email = "pin0513@gmail.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Test1234"),
            DisplayName = "Paul",
            Role = "admin",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        context.Users.Add(adminUser);

        // Seed Categories
        var categories = new List<Category>
        {
            new() { Name = "技術", Slug = "tech", SortOrder = 1 },
            new() { Name = "生活", Slug = "life", SortOrder = 2 },
            new() { Name = "旅遊", Slug = "travel", SortOrder = 3 },
            new() { Name = "閱讀", Slug = "reading", SortOrder = 4 }
        };
        context.Categories.AddRange(categories);

        // Seed Tags
        var tags = new List<Tag>
        {
            new() { Name = "C#", Slug = "csharp" },
            new() { Name = ".NET", Slug = "dotnet" },
            new() { Name = "React", Slug = "react" },
            new() { Name = "TypeScript", Slug = "typescript" },
            new() { Name = "Next.js", Slug = "nextjs" },
            new() { Name = "隨筆", Slug = "essay" }
        };
        context.Tags.AddRange(tags);

        await context.SaveChangesAsync();

        // Seed Sample Article
        var sampleArticle = new Article
        {
            Title = "Hello, Blog",
            Slug = "hello-blog",
            Summary = "歡迎來到 PaulFun Blogger，這是我的第一篇文章，記錄這個部落格的誕生。",
            Content = @"<h2>嗨，歡迎光臨</h2>
<p>這裡是 <strong>PaulFun Blogger</strong>，一個用 .NET 8 + Next.js 14 打造的個人部落格。</p>
<h2>為什麼要寫部落格？</h2>
<p>寫部落格是整理思緒最好的方式。把腦中模糊的想法變成文字的過程，本身就是一種學習。</p>
<blockquote><p>「如果你沒辦法簡單地解釋一件事，代表你還不夠了解它。」— Richard Feynman</p></blockquote>
<h2>技術棧</h2>
<p>這個部落格使用了以下技術：</p>
<ul>
<li><strong>前端</strong>：Next.js 14 (App Router) + TailwindCSS + Tiptap Editor</li>
<li><strong>後端</strong>：.NET 8 Minimal API + EF Core 8</li>
<li><strong>資料庫</strong>：SQL Server 2022</li>
<li><strong>部署</strong>：GCP Cloud Run</li>
</ul>
<h2>接下來的計畫</h2>
<p>未來會在這裡分享技術筆記、開發心得、以及各種有趣的東西。敬請期待！</p>
<pre><code>console.log('Hello, Blog!');</code></pre>",
            CategoryId = categories[0].Id,
            AuthorId = adminUser.Id,
            Status = "published",
            PublishedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };
        sampleArticle.Tags.Add(tags[1]); // .NET
        sampleArticle.Tags.Add(tags[4]); // Next.js
        context.Articles.Add(sampleArticle);

        await context.SaveChangesAsync();
    }
}
