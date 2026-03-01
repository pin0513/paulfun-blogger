"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getArticles } from "@/lib/api/articles";
import { getCoverUrl, getMediaUrl } from "@/lib/api/media";
import type { ArticleListItem } from "@/types";

export default function HomePage() {
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function fetchArticles() {
      setIsLoading(true);
      try {
        const response = await getArticles({
          page,
          pageSize: 9,
          sortBy: "publishedAt",
          descending: true,
        });
        if (response.success && response.data) {
          setArticles(response.data.items);
          setTotalPages(response.data.totalPages);
        }
      } catch (error) {
        console.error("Failed to fetch articles:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchArticles();
  }, [page]);

  // IntersectionObserver for card entrance animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-card-enter");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    const cards = document.querySelectorAll("[data-card-animate]");
    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [articles]);

  return (
    <>
      {/* Hero Section - Static with profile */}
      <section className="relative h-[300px] md:h-[400px] overflow-hidden">
        {/* Background image */}
        <img
          src={getMediaUrl("/uploads/hero/family-photo.jpg")}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Overlay - light mode */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-white/40 to-white dark:hidden" />

        {/* Overlay - dark mode */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-[#0A0A0F] hidden dark:block" />

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white dark:border-primary/60 shadow-lg mb-4">
            <img
              src={getMediaUrl("/uploads/2023/06/cropped-resize_DSC05380-150x150.jpg")}
              alt="Paul Huang"
              className="w-full h-full object-cover"
            />
          </div>

          <h1 className="text-3xl md:text-4xl font-heading font-bold mb-2">
            <span className="text-gray-800 dark:text-white">Paul Huang</span>
          </h1>
          <p className="text-base text-gray-600 dark:text-white/70 mb-2">
            工程師 · 爸爸 · 羽球愛好者
          </p>
          <p className="text-sm text-gray-500 dark:text-white/50 max-w-md">
            技術深潛、生活紀錄、記錄人生的每個精彩時刻
          </p>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-16" style={{ background: "var(--color-surface)" }}>
        <div className="container-wide">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Text - on mobile comes second (order-2), on desktop first (md:order-1) */}
            <div className="order-2 md:order-1">
              <h2 className="text-2xl font-heading font-bold mb-4" style={{ color: "var(--color-primary)" }}>
                關於 Paul
              </h2>
              <div className="space-y-4" style={{ color: "var(--color-text-secondary)" }}>
                <p>
                  嗨，我是保羅！一個熱愛技術的工程師，同時也是兩個孩子的爸。
                </p>
                <p>
                  在這裡分享技術心得、開發筆記，以及生活的點點滴滴。從程式碼到育兒經，從羽球場到咖啡廳，記錄每一個值得回味的時刻。
                </p>
              </div>
            </div>

            {/* Image - on mobile comes first (order-1), on desktop second (md:order-2) */}
            <div className="order-1 md:order-2">
              <img
                src={getMediaUrl("/uploads/hero/family-photo.jpg")}
                alt="Paul 的家庭照片"
                className="w-full aspect-[4/3] object-cover rounded-xl shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="py-16">
        <div className="container-wide">
          <div className="flex items-center gap-4 mb-10">
            <div className="h-px flex-1 bg-gradient-to-r from-primary/50 to-transparent" />
            <h2 className="text-xl font-heading font-semibold text-[var(--color-text)]">
              最新文章
            </h2>
            <div className="h-px flex-1 bg-gradient-to-l from-primary/50 to-transparent" />
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card animate-pulse">
                  <div className="h-48 rounded-md mb-4" style={{ background: "var(--color-bg)" }} />
                  <div className="h-4 rounded w-1/4 mb-3" style={{ background: "var(--color-bg)" }} />
                  <div className="h-6 rounded w-3/4 mb-2" style={{ background: "var(--color-bg)" }} />
                  <div className="h-4 rounded w-full mb-4" style={{ background: "var(--color-bg)" }} />
                  <div className="h-3 rounded w-1/3" style={{ background: "var(--color-bg)" }} />
                </div>
              ))}
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4 opacity-30">{"</>"}</div>
              <p className="text-lg text-[var(--color-text-muted)]">尚無文章</p>
              <p className="text-sm mt-2 text-[var(--color-text-muted)]">
                第一篇文章即將發佈...
              </p>
            </div>
          ) : (
            <>
              {/* Featured (first article) */}
              {articles.length > 0 && (
                <Link
                  href={`/articles/${articles[0].id}`}
                  className="block mb-8"
                >
                  <article className="card-glow p-0 overflow-hidden grid grid-cols-1 md:grid-cols-2 group hover:-translate-y-1 transition-transform duration-300">
                    <div className="aspect-video md:aspect-auto relative overflow-hidden" style={{ background: "var(--color-bg)" }}>
                      <img
                        src={getCoverUrl(articles[0].coverImage)}
                        alt={articles[0].title}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20 hidden md:block" />
                    </div>
                    <div className="p-8 flex flex-col justify-center">
                      <div className="flex items-center gap-3 mb-3">
                        {articles[0].category && (
                          <span
                            className="text-xs font-medium border px-2 py-0.5 rounded"
                            style={{
                              color: "var(--color-category)",
                              borderColor: "var(--color-category)",
                            }}
                          >
                            {articles[0].category.name}
                          </span>
                        )}
                        <span className="text-xs font-mono" style={{ color: "var(--color-meta)" }}>
                          {articles[0].publishedAt
                            ? new Date(articles[0].publishedAt).toLocaleDateString("zh-TW")
                            : ""}
                        </span>
                      </div>
                      <h3 className="text-2xl font-heading font-bold mb-3 group-hover:text-[var(--color-primary)] transition-colors" style={{ color: "var(--color-text)" }}>
                        {articles[0].title}
                      </h3>
                      {articles[0].summary && (
                        <p className="leading-relaxed line-clamp-3" style={{ color: "var(--color-text-muted)" }}>
                          {articles[0].summary}
                        </p>
                      )}
                      <div className="mt-4 flex items-center gap-3">
                        <span className="text-sm" style={{ color: "var(--color-meta)" }}>
                          {articles[0].author.displayName}
                        </span>
                        <span style={{ color: "var(--color-meta)" }}>&middot;</span>
                        <span className="text-sm" style={{ color: "var(--color-meta)" }}>
                          {articles[0].viewCount} 次瀏覽
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              )}

              {/* Rest of articles */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.slice(1).map((article, index) => (
                  <div
                    key={article.id}
                    data-card-animate
                    style={{ opacity: 0, animationDelay: `${index * 80}ms` }}
                  >
                    <ArticleCard article={article} />
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-12 flex justify-center gap-3">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn btn-outline disabled:opacity-30"
                  >
                    &larr; 上一頁
                  </button>
                  <span className="px-4 py-2 font-mono text-sm" style={{ color: "var(--color-text-muted)" }}>
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="btn btn-outline disabled:opacity-30"
                  >
                    下一頁 &rarr;
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}

function ArticleCard({ article }: { article: ArticleListItem }) {
  return (
    <Link href={`/articles/${article.id}`}>
      <article className="card-glow h-full flex flex-col p-0 overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
        <div className="aspect-video relative overflow-hidden" style={{ background: "var(--color-bg)" }}>
          <img
            src={getCoverUrl(article.coverImage)}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          />
        </div>
        <div className="p-5 flex flex-col flex-1">
          <div className="flex items-center gap-2 mb-3">
            {article.category && (
              <span
                className="text-xs font-medium"
                style={{ color: "var(--color-category)" }}
              >
                {article.category.name}
              </span>
            )}
            {article.tags.slice(0, 2).map((tag) => (
              <span
                key={tag.id}
                className="text-xs px-1.5 py-0.5 rounded"
                style={{
                  color: "var(--color-tag)",
                  border: "1px solid currentColor",
                  opacity: 0.8,
                }}
              >
                {tag.name}
              </span>
            ))}
          </div>
          <h3 className="text-lg font-heading font-semibold mb-2 group-hover:text-[var(--color-primary)] transition-colors line-clamp-2" style={{ color: "var(--color-text)" }}>
            {article.title}
          </h3>
          {article.summary && (
            <p className="text-sm mb-4 line-clamp-2 flex-1" style={{ color: "var(--color-text-muted)" }}>
              {article.summary}
            </p>
          )}
          <div className="flex items-center justify-between text-xs mt-auto pt-3" style={{ color: "var(--color-meta)", borderTop: "1px solid var(--color-border)" }}>
            <span>{article.author.displayName}</span>
            <div className="flex items-center gap-3">
              <span>{article.viewCount} views</span>
              <span>
                {article.publishedAt
                  ? new Date(article.publishedAt).toLocaleDateString("zh-TW")
                  : ""}
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
