"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getArticles, getCategories } from "@/lib/api/articles";
import { getCoverUrl } from "@/lib/api/media";
import type { ArticleListItem } from "@/types";

interface Category {
  id: number;
  name: string;
  slug: string;
}

export default function CategoryPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [category, setCategory] = useState<Category | null>(null);
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        // Fetch categories to find the matching one
        const catRes = await getCategories();
        if (catRes.success && catRes.data) {
          const found = catRes.data.find((c) => c.slug === slug);
          if (found) {
            setCategory(found);

            // Fetch articles for this category
            const artRes = await getArticles({
              categoryId: found.id,
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
        console.error("Failed to fetch category data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [slug, page]);

  if (!isLoading && !category) {
    return (
      <div className="container-wide py-20 text-center">
        <div className="text-6xl mb-4 opacity-30">?</div>
        <p className="text-text-muted text-lg mb-4">找不到此分類</p>
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
          <span className="text-text">分類</span>
          {category && (
            <>
              <span>/</span>
              <span className="text-secondary-300">{category.name}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="w-1 h-8 bg-gradient-to-b from-primary to-secondary rounded-full" />
          <h1 className="text-3xl font-heading font-bold text-text">
            {category?.name || "載入中..."}
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
          <p className="text-text-muted">此分類尚無文章</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <Link key={article.id} href={`/articles/${article.id}`}>
                <article className="card-glow h-full flex flex-col p-0 overflow-hidden group">
                  <div className="aspect-video bg-background relative overflow-hidden">
                    <img
                      src={getCoverUrl(article.coverImage)}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-5 flex flex-col flex-1">
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
