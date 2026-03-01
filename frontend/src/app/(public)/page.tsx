"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getArticles } from "@/lib/api/articles";
import { getMediaUrl } from "@/lib/api/media";
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

  return (
    <>
      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/images/hero.png"
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-background/60" />
        </div>
        <div className="container-narrow text-center relative z-10">
          <img
            src="/images/avatar.png"
            alt="PaulFun"
            className="w-20 h-20 rounded-full mx-auto mb-6 border-2 border-primary/50 shadow-glow"
          />
          <h1 className="text-4xl md:text-6xl font-heading font-bold mb-6">
            <span className="text-primary text-neon">Paul</span>
            <span className="text-text">Fun</span>
          </h1>
          <p className="text-lg text-text-muted mb-8 max-w-2xl mx-auto leading-relaxed">
            探索技術的深淵，分享程式碼背後的故事。
          </p>
          <div className="flex items-center justify-center gap-4">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-primary/50" />
            <span className="text-xs text-text-muted font-mono tracking-widest uppercase">
              Tech Blog
            </span>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-primary/50" />
          </div>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="py-16">
        <div className="container-wide">
          <div className="flex items-center gap-4 mb-10">
            <div className="h-px flex-1 bg-gradient-to-r from-primary/50 to-transparent" />
            <h2 className="text-xl font-heading font-semibold text-text">
              最新文章
            </h2>
            <div className="h-px flex-1 bg-gradient-to-l from-primary/50 to-transparent" />
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card animate-pulse">
                  <div className="h-48 bg-background rounded-md mb-4" />
                  <div className="h-4 bg-background rounded w-1/4 mb-3" />
                  <div className="h-6 bg-background rounded w-3/4 mb-2" />
                  <div className="h-4 bg-background rounded w-full mb-4" />
                  <div className="h-3 bg-background rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4 opacity-30">{"</>"}</div>
              <p className="text-text-muted text-lg">尚無文章</p>
              <p className="text-text-muted text-sm mt-2">
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
                  <article className="card-glow p-0 overflow-hidden grid grid-cols-1 md:grid-cols-2">
                    <div className="aspect-video md:aspect-auto bg-background relative">
                      {articles[0].coverImage ? (
                        <img
                          src={getMediaUrl(articles[0].coverImage)}
                          alt={articles[0].title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full min-h-[250px] flex items-center justify-center bg-gradient-cyber">
                          <span className="text-4xl text-primary/30 font-mono">
                            {"</>"}
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-surface/50 hidden md:block" />
                    </div>
                    <div className="p-8 flex flex-col justify-center">
                      <div className="flex items-center gap-3 mb-3">
                        {articles[0].category && (
                          <span className="text-xs font-medium text-secondary-300 border border-secondary/30 px-2 py-0.5 rounded">
                            {articles[0].category.name}
                          </span>
                        )}
                        <span className="text-xs text-text-muted font-mono">
                          {articles[0].publishedAt
                            ? new Date(articles[0].publishedAt).toLocaleDateString("zh-TW")
                            : ""}
                        </span>
                      </div>
                      <h3 className="text-2xl font-heading font-bold text-text mb-3 group-hover:text-primary transition-colors">
                        {articles[0].title}
                      </h3>
                      {articles[0].summary && (
                        <p className="text-text-muted leading-relaxed line-clamp-3">
                          {articles[0].summary}
                        </p>
                      )}
                      <div className="mt-4 flex items-center gap-3">
                        <span className="text-sm text-text-muted">
                          {articles[0].author.displayName}
                        </span>
                        <span className="text-text-muted">·</span>
                        <span className="text-sm text-text-muted">
                          {articles[0].viewCount} 次瀏覽
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              )}

              {/* Rest of articles */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.slice(1).map((article) => (
                  <ArticleCard key={article.id} article={article} />
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
                    ← 上一頁
                  </button>
                  <span className="px-4 py-2 text-text-muted font-mono text-sm">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="btn btn-outline disabled:opacity-30"
                  >
                    下一頁 →
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
      <article className="card-glow h-full flex flex-col p-0 overflow-hidden group">
        <div className="aspect-video bg-background relative overflow-hidden">
          {article.coverImage ? (
            <img
              src={getMediaUrl(article.coverImage)}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-cyber">
              <span className="text-2xl text-primary/20 font-mono">
                {"</>"}
              </span>
            </div>
          )}
        </div>
        <div className="p-5 flex flex-col flex-1">
          <div className="flex items-center gap-2 mb-3">
            {article.category && (
              <span className="text-xs font-medium text-secondary-300">
                {article.category.name}
              </span>
            )}
            {article.tags.slice(0, 2).map((tag) => (
              <span
                key={tag.id}
                className="text-xs text-text-muted border border-border px-1.5 py-0.5 rounded"
              >
                {tag.name}
              </span>
            ))}
          </div>
          <h3 className="text-lg font-heading font-semibold text-text mb-2 group-hover:text-primary transition-colors line-clamp-2">
            {article.title}
          </h3>
          {article.summary && (
            <p className="text-sm text-text-muted mb-4 line-clamp-2 flex-1">
              {article.summary}
            </p>
          )}
          <div className="flex items-center justify-between text-xs text-text-muted mt-auto pt-3 border-t border-border">
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
