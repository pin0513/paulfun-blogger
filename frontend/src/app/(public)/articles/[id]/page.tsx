"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getArticleByID } from "@/lib/api/articles";
import { getCoverUrl } from "@/lib/api/media";
import { TableOfContents } from "@/components/article/TableOfContents";
import { ReactionButtons } from "@/components/article/ReactionButtons";
import { CommentList } from "@/components/comment/CommentList";
import { FontSizeControl } from "@/components/article/FontSizeControl";
import { MobileToc } from "@/components/article/MobileToc";
import type { Article } from "@/types";

export default function ArticlePage() {
  const params = useParams();
  const id = Number(params.id);

  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchArticle() {
      try {
        const res = await getArticleByID(id);
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
  }, [id]);

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
      {/* Cover Image */}
      <div className="relative bg-neutral-900 w-full overflow-hidden max-h-[240px] md:max-h-[480px]">
        {article.coverImage && (
          <img
            src={getCoverUrl(article.coverImage)}
            alt={article.title}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/30 to-transparent" />
      </div>

      {/* Article Header */}
      <div className="max-w-[680px] mx-auto px-4 lg:px-0 -mt-8 relative z-10">
        {/* Category & Tags */}
        <div className="flex items-center gap-3 mb-4">
          {article.category && (
            <Link
              href={`/categories/${article.category.slug}`}
              className="text-xs font-medium border px-2 py-0.5 rounded hover:opacity-80"
              style={{
                color: "var(--color-category)",
                borderColor: "var(--color-category)",
              }}
            >
              {article.category.name}
            </Link>
          )}
          {article.tags.map((tag) => (
            <Link
              key={tag.id}
              href={`/tags/${tag.slug}`}
              className="text-xs px-2 py-0.5 rounded transition-colors"
              style={{
                color: "var(--color-tag)",
                borderWidth: "1px",
                borderColor: "var(--color-tag)",
                opacity: 0.8,
              }}
            >
              #{tag.name}
            </Link>
          ))}
        </div>

        {/* Title */}
        <h1
          className="text-3xl md:text-4xl font-heading font-bold mb-6 leading-tight"
          style={{ color: "var(--color-text)" }}
        >
          {article.title}
        </h1>

        {/* Meta */}
        <div className="flex items-center gap-4 text-sm" style={{ color: "var(--color-text-muted)" }}>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                color: "var(--color-primary)",
              }}
            >
              {article.author.displayName?.charAt(0).toUpperCase()}
            </div>
            <span>{article.author.displayName}</span>
          </div>
          <span style={{ color: "var(--color-border)" }}>|</span>
          <span className="font-mono text-xs">
            {article.publishedAt
              ? new Date(article.publishedAt).toLocaleDateString("zh-TW", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : ""}
          </span>
          <span style={{ color: "var(--color-border)" }}>|</span>
          <span className="font-mono text-xs">{article.viewCount} views</span>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[900px] mx-auto px-4 lg:px-0 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-12">
          {/* Main Content */}
          <div>
            {/* Summary */}
            {article.summary && (
              <div
                className="mb-8 p-4 rounded-r-lg"
                style={{
                  borderLeft: "2px solid var(--color-primary)",
                  background: "var(--color-surface)",
                  opacity: 0.9,
                }}
              >
                <p
                  className="italic leading-relaxed"
                  style={{
                    fontFamily: "'Noto Serif TC', Georgia, serif",
                    color: "var(--color-text-muted)",
                  }}
                >
                  {article.summary}
                </p>
              </div>
            )}

            {/* Article Body */}
            <article
              className="prose-article"
              dangerouslySetInnerHTML={{ __html: processedContent }}
            />

            {/* Tags (bottom) */}
            {article.tags.length > 0 && (
              <div
                className="mt-12 pt-6"
                style={{ borderTop: "1px solid var(--color-border)" }}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-sm font-mono"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    tags:
                  </span>
                  {article.tags.map((tag) => (
                    <Link
                      key={tag.id}
                      href={`/tags/${tag.slug}`}
                      className="text-sm px-3 py-1 rounded-full transition-colors"
                      style={{
                        color: "var(--color-tag)",
                        border: "1px solid var(--color-tag)",
                        opacity: 0.8,
                      }}
                    >
                      #{tag.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Reactions */}
            <div
              className="mt-8 pt-6"
              style={{ borderTop: "1px solid var(--color-border)" }}
            >
              <p
                className="text-sm mb-4"
                style={{ color: "var(--color-text-muted)" }}
              >
                覺得這篇文章如何？
              </p>
              <ReactionButtons articleId={article.id} />
            </div>

            {/* Comments */}
            <div
              className="mt-12 pt-8"
              style={{ borderTop: "1px solid var(--color-border)" }}
            >
              <CommentList articleId={article.id} />
            </div>
          </div>

          {/* Sidebar - Table of Contents */}
          <aside className="hidden lg:block">
            <TableOfContents content={article.content} />
          </aside>
        </div>
      </div>

      <FontSizeControl />
      <MobileToc content={article.content} />
    </>
  );
}
