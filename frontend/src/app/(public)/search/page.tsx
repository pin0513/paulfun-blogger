"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getArticles } from "@/lib/api/articles";
import { getCoverUrl } from "@/lib/api/media";
import type { ArticleListItem } from "@/types";

function SearchContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    setPage(1);
  }, [q]);

  useEffect(() => {
    if (!q.trim()) {
      setArticles([]);
      setTotalCount(0);
      setTotalPages(1);
      return;
    }

    async function fetchResults() {
      setIsLoading(true);
      try {
        const response = await getArticles({
          search: q,
          page,
          pageSize: 20,
          sortBy: "publishedAt",
          descending: true,
        });
        if (response.success && response.data) {
          setArticles(response.data.items);
          setTotalPages(response.data.totalPages);
          setTotalCount(response.data.totalCount);
        }
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchResults();
  }, [q, page]);

  return (
    <section className="py-12">
      <div className="container-wide">
        <div className="mb-10">
          <h1 className="text-3xl font-heading font-bold mb-2" style={{ color: "var(--color-text)" }}>
            搜尋結果
          </h1>
          {q && (
            <p style={{ color: "var(--color-text-muted)" }}>
              搜尋「<span style={{ color: "var(--color-primary)" }}>{q}</span>」
              {!isLoading && (
                <span className="ml-2">共 {totalCount} 筆結果</span>
              )}
            </p>
          )}
        </div>

        {!q.trim() ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 opacity-30">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-lg" style={{ color: "var(--color-text-muted)" }}>請輸入關鍵字搜尋文章</p>
          </div>
        ) : isLoading ? (
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
            <p className="text-lg" style={{ color: "var(--color-text-muted)" }}>
              找不到符合「{q}」的文章
            </p>
            <p className="text-sm mt-2" style={{ color: "var(--color-text-muted)" }}>
              試試其他關鍵字吧
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article) => (
                <Link key={article.id} href={`/articles/${article.id}`}>
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
              ))}
            </div>

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
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <section className="py-12">
        <div className="container-wide">
          <div className="animate-pulse">
            <div className="h-8 rounded w-1/4 mb-4" style={{ background: "var(--color-surface)" }} />
            <div className="h-4 rounded w-1/3 mb-10" style={{ background: "var(--color-surface)" }} />
          </div>
        </div>
      </section>
    }>
      <SearchContent />
    </Suspense>
  );
}
