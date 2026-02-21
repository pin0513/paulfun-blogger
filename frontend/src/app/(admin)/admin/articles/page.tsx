"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getAdminArticles, deleteArticle, publishArticle, unpublishArticle } from "@/lib/api/articles";
import type { ArticleListItem } from "@/types";

export default function ArticlesPage() {
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [descending, setDescending] = useState(true);

  const fetchArticles = async () => {
    setIsLoading(true);
    try {
      const response = await getAdminArticles({
        page,
        pageSize: 10,
        status: statusFilter || undefined,
        sortBy,
        descending,
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
  };

  useEffect(() => {
    fetchArticles();
  }, [page, statusFilter, sortBy, descending]);

  const handleDelete = async (id: number) => {
    if (!confirm("確定要刪除這篇文章嗎？")) return;

    try {
      const response = await deleteArticle(id);
      if (response.success) {
        fetchArticles();
      }
    } catch (error) {
      console.error("Failed to delete article:", error);
    }
  };

  const handlePublish = async (id: number) => {
    try {
      const response = await publishArticle(id);
      if (response.success) {
        fetchArticles();
      }
    } catch (error) {
      console.error("Failed to publish article:", error);
    }
  };

  const handleUnpublish = async (id: number) => {
    try {
      const response = await unpublishArticle(id);
      if (response.success) {
        fetchArticles();
      }
    } catch (error) {
      console.error("Failed to unpublish article:", error);
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setDescending((d) => !d);
    } else {
      setSortBy(field);
      setDescending(true);
    }
    setPage(1);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      published: "bg-green-900/50 text-green-400 border border-green-500/30",
      draft: "bg-gray-800/50 text-gray-400 border border-gray-600/30",
      scheduled: "bg-blue-900/50 text-blue-400 border border-blue-500/30",
    };
    const labels: Record<string, string> = {
      published: "已發佈",
      draft: "草稿",
      scheduled: "排程",
    };
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}
      >
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold text-text">文章管理</h1>
        <Link href="/admin/articles/new" className="btn btn-primary">
          ✏️ 新增文章
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="input w-40"
        >
          <option value="">所有狀態</option>
          <option value="draft">草稿</option>
          <option value="published">已發佈</option>
          <option value="scheduled">排程</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
          className="input w-40"
        >
          <option value="createdAt">建立時間</option>
          <option value="publishedAt">發佈時間</option>
          <option value="title">標題</option>
          <option value="viewCount">瀏覽次數</option>
        </select>
        <button
          onClick={() => setDescending((d) => !d)}
          className="btn btn-outline px-3"
          title={descending ? "目前：新到舊" : "目前：舊到新"}
        >
          {descending ? "↓ 降序" : "↑ 升序"}
        </button>
      </div>

      {/* Articles List */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-text-muted">載入中...</div>
        ) : articles.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            <p>尚無文章</p>
            <Link
              href="/admin/articles/new"
              className="text-primary hover:underline mt-2 inline-block"
            >
              建立第一篇文章
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-surface">
              <tr>
                <SortableHeader field="title" label="標題" currentSort={sortBy} descending={descending} onSort={handleSort} />
                <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">
                  狀態
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-text-muted">
                  分類
                </th>
                <SortableHeader field="viewCount" label="瀏覽" currentSort={sortBy} descending={descending} onSort={handleSort} />
                <SortableHeader field="publishedAt" label="發佈時間" currentSort={sortBy} descending={descending} onSort={handleSort} />
                <th className="px-4 py-3 text-right text-sm font-medium text-text-muted">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {articles.map((article) => (
                <tr key={article.id} className="hover:bg-surface/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/articles/${article.id}`}
                      className="font-medium text-text hover:text-primary"
                    >
                      {article.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(article.status)}</td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {article.category?.name || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {article.viewCount}
                  </td>
                  <td className="px-4 py-3 text-sm text-text-muted">
                    {article.publishedAt
                      ? new Date(article.publishedAt).toLocaleDateString("zh-TW")
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/articles/${article.id}`}
                        className="text-sm text-primary hover:underline"
                      >
                        編輯
                      </Link>
                      {article.status === "draft" ? (
                        <button
                          onClick={() => handlePublish(article.id)}
                          className="text-sm text-green-600 hover:underline"
                        >
                          發佈
                        </button>
                      ) : article.status === "published" ? (
                        <button
                          onClick={() => handleUnpublish(article.id)}
                          className="text-sm text-orange-600 hover:underline"
                        >
                          取消發佈
                        </button>
                      ) : null}
                      <button
                        onClick={() => handleDelete(article.id)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        刪除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn btn-outline"
          >
            上一頁
          </button>
          <span className="px-4 py-2 text-text-muted">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn btn-outline"
          >
            下一頁
          </button>
        </div>
      )}
    </div>
  );
}

function SortableHeader({
  field,
  label,
  currentSort,
  descending,
  onSort,
}: {
  field: string;
  label: string;
  currentSort: string;
  descending: boolean;
  onSort: (field: string) => void;
}) {
  const isActive = currentSort === field;
  return (
    <th
      className="px-4 py-3 text-left text-sm font-medium text-text-muted cursor-pointer hover:text-text select-none"
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          <span className="text-primary">{descending ? "↓" : "↑"}</span>
        ) : (
          <span className="opacity-30">↕</span>
        )}
      </span>
    </th>
  );
}
