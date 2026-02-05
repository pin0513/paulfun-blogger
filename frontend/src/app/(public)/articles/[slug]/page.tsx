"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getArticleBySlug } from "@/lib/api/articles";
import { getMediaUrl } from "@/lib/api/media";
import { TableOfContents } from "@/components/article/TableOfContents";
import { ReactionButtons } from "@/components/article/ReactionButtons";
import { CommentList } from "@/components/comment/CommentList";
import type { Article } from "@/types";

export default function ArticlePage() {
  const params = useParams();
  const slug = params.slug as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchArticle() {
      try {
        const res = await getArticleBySlug(slug);
        if (res.success && res.data) {
          setArticle(res.data);
        } else {
          setError("找不到文章");
        }
      } catch {
        setError("載入文章失敗");
      } finally {
        setIsLoading(false);
      }
    }
    fetchArticle();
  }, [slug]);

  // Process content to add toc IDs to headings
  const processedContent = useMemo(() => {
    if (!article?.content) return "";

    let headingIndex = 0;
    return article.content.replace(
      /<(h[1-3])([^>]*)>/g,
      (match, tag, attrs) => {
        const id = `heading-${headingIndex++}`;
        return `<${tag}${attrs} data-toc-id="${id}">`;
      }
    );
  }, [article?.content]);

  if (isLoading) {
    return (
      <div className="container-wide py-16">
        <div className="max-w-3xl mx-auto animate-pulse">
          <div className="h-8 bg-surface rounded w-3/4 mb-4" />
          <div className="h-4 bg-surface rounded w-1/2 mb-8" />
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-4 bg-surface rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="container-wide py-20 text-center">
        <div className="text-6xl mb-4 opacity-30">404</div>
        <p className="text-text-muted text-lg mb-4">{error || "找不到文章"}</p>
        <Link href="/" className="text-primary hover:underline">
          ← 返回首頁
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Article Header */}
      <header className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-cyber" />
        {article.coverImage && (
          <div className="absolute inset-0 opacity-10">
            <img
              src={getMediaUrl(article.coverImage)}
              alt=""
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-background" />

        <div className="container-narrow relative z-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-text-muted mb-6">
            <Link href="/" className="hover:text-primary">
              首頁
            </Link>
            <span>/</span>
            {article.category && (
              <>
                <Link
                  href={`/categories/${article.category.slug}`}
                  className="hover:text-secondary-300"
                >
                  {article.category.name}
                </Link>
                <span>/</span>
              </>
            )}
            <span className="text-text truncate">{article.title}</span>
          </div>

          {/* Category & Tags */}
          <div className="flex items-center gap-3 mb-4">
            {article.category && (
              <Link
                href={`/categories/${article.category.slug}`}
                className="text-xs font-medium text-secondary-300 border border-secondary/30 px-2 py-0.5 rounded hover:bg-secondary/10"
              >
                {article.category.name}
              </Link>
            )}
            {article.tags.map((tag) => (
              <Link
                key={tag.id}
                href={`/tags/${tag.slug}`}
                className="text-xs text-text-muted border border-border px-2 py-0.5 rounded hover:border-primary hover:text-primary"
              >
                #{tag.name}
              </Link>
            ))}
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-text mb-6 leading-tight">
            {article.title}
          </h1>

          {/* Meta */}
          <div className="flex items-center gap-4 text-sm text-text-muted">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-xs text-primary font-mono">
                {article.author.displayName?.charAt(0).toUpperCase()}
              </div>
              <span>{article.author.displayName}</span>
            </div>
            <span className="text-border">|</span>
            <span className="font-mono text-xs">
              {article.publishedAt
                ? new Date(article.publishedAt).toLocaleDateString("zh-TW", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : ""}
            </span>
            <span className="text-border">|</span>
            <span className="font-mono text-xs">
              {article.viewCount} views
            </span>
          </div>
        </div>
      </header>

      {/* Article Content */}
      <div className="container-wide py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_250px] gap-10 max-w-5xl mx-auto">
          {/* Main Content */}
          <div>
            {/* Summary */}
            {article.summary && (
              <div className="mb-8 p-4 border-l-2 border-primary/50 bg-surface/50 rounded-r-lg">
                <p className="text-text-muted italic leading-relaxed">
                  {article.summary}
                </p>
              </div>
            )}

            {/* Article Body */}
            <article
              className="prose-cyber"
              dangerouslySetInnerHTML={{ __html: processedContent }}
            />

            {/* Tags (bottom) */}
            {article.tags.length > 0 && (
              <div className="mt-12 pt-6 border-t border-border">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-text-muted font-mono">tags:</span>
                  {article.tags.map((tag) => (
                    <Link
                      key={tag.id}
                      href={`/tags/${tag.slug}`}
                      className="text-sm text-primary border border-primary/30 px-3 py-1 rounded-full hover:bg-primary/10 transition-colors"
                    >
                      #{tag.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Reactions */}
            <div className="mt-8 pt-6 border-t border-border">
              <p className="text-sm text-text-muted mb-4">覺得這篇文章如何？</p>
              <ReactionButtons articleId={article.id} />
            </div>

            {/* Comments */}
            <div className="mt-12 pt-8 border-t border-border">
              <CommentList articleId={article.id} />
            </div>
          </div>

          {/* Sidebar - Table of Contents */}
          <aside className="hidden lg:block">
            <TableOfContents content={article.content} />
          </aside>
        </div>
      </div>
    </>
  );
}
