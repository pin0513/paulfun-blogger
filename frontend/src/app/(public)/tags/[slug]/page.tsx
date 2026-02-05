"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getArticles, getTags } from "@/lib/api/articles";
import { getMediaUrl } from "@/lib/api/media";
import type { ArticleListItem } from "@/types";

interface Tag {
  id: number;
  name: string;
  slug: string;
}

export default function TagPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [tag, setTag] = useState<Tag | null>(null);
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const tagRes = await getTags();
        if (tagRes.success && tagRes.data) {
          const found = tagRes.data.find((t) => t.slug === slug);
          if (found) {
            setTag(found);

            const artRes = await getArticles({
              tagId: found.id,
              page,
              pageSize: 12,
              sortBy: "publishedAt",
              descending: true,
            });
            if (artRes.success && artRes.data) {
              setArticles(artRes.data.items);
              setTotalPages(artRes.data.totalPages);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch tag data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [slug, page]);

  if (!isLoading && !tag) {
    return (
      <div className="container-wide py-20 text-center">
        <div className="text-6xl mb-4 opacity-30">#</div>
        <p className="text-text-muted text-lg mb-4">找不到此標籤</p>
        <Link href="/" className="text-primary hover:underline">
          ← 返回首頁
        </Link>
      </div>
    );
  }

  return (
    <div className="container-wide py-12">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-sm text-text-muted mb-4">
          <Link href="/" className="hover:text-primary">
            首頁
          </Link>
          <span>/</span>
          <span className="text-text">標籤</span>
          {tag && (
            <>
              <span>/</span>
              <span className="text-primary">#{tag.name}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-3xl text-primary font-mono">#</span>
          <h1 className="text-3xl font-heading font-bold text-text">
            {tag?.name || "載入中..."}
          </h1>
        </div>
      </div>

      {/* Articles Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-48 bg-background rounded-md mb-4" />
              <div className="h-6 bg-background rounded w-3/4 mb-2" />
              <div className="h-4 bg-background rounded w-full" />
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-text-muted">此標籤尚無文章</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <Link key={article.id} href={`/articles/${article.slug}`}>
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
                      <span>
                        {article.publishedAt
                          ? new Date(article.publishedAt).toLocaleDateString(
                              "zh-TW"
                            )
                          : ""}
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
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
  );
}
