"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getRelatedArticles } from "@/lib/api/articles";
import type { RelatedArticles as RelatedData, SeriesItem } from "@/types";

interface RelatedArticlesProps {
  articleId: number;
}

export function RelatedArticles({ articleId }: RelatedArticlesProps) {
  const [data, setData] = useState<RelatedData | null>(null);

  useEffect(() => {
    let cancelled = false;
    getRelatedArticles(articleId)
      .then((resp) => {
        if (!cancelled && resp.success && resp.data) setData(resp.data);
      })
      .catch(() => {
        /* 無串連資料不影響閱讀 */
      });
    return () => {
      cancelled = true;
    };
  }, [articleId]);

  if (!data || (data.series.length === 0 && data.related.length === 0)) {
    return null;
  }

  return (
    <div
      className="mt-8 pt-6"
      style={{ borderTop: "1px solid var(--color-border)" }}
    >
      {data.series.length > 0 && (
        <div className="mb-6">
          <h3
            className="text-sm font-mono mb-3"
            style={{ color: "var(--color-text-muted)" }}
          >
            📖 系列文章
          </h3>
          <ol className="space-y-2">
            {data.series.map((item, idx) => (
              <li key={item.id} className="flex items-baseline gap-3">
                <span
                  className="text-xs font-mono shrink-0"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  第 {idx + 1} 部
                </span>
                {item.isCurrent ? (
                  <span
                    className="text-sm font-semibold"
                    style={{ color: "var(--color-primary)" }}
                  >
                    {item.title}（本篇）
                  </span>
                ) : (
                  <Link
                    href={`/articles/${item.id}`}
                    className="text-sm hover:underline"
                    style={{ color: "var(--color-text)" }}
                  >
                    {item.title}
                  </Link>
                )}
                {item.note && (
                  <span
                    className="text-xs"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    — {item.note}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {data.related.length > 0 && (
        <div>
          <h3
            className="text-sm font-mono mb-3"
            style={{ color: "var(--color-text-muted)" }}
          >
            🔗 相關文章
          </h3>
          <ul className="space-y-2">
            {data.related.map((item: SeriesItem) => (
              <li key={item.id}>
                <Link
                  href={`/articles/${item.id}`}
                  className="text-sm hover:underline"
                  style={{ color: "var(--color-text)" }}
                >
                  {item.title}
                </Link>
                {item.note && (
                  <span
                    className="text-xs ml-2"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    — {item.note}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
