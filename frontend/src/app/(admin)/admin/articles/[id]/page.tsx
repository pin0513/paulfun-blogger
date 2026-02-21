"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { TiptapEditor } from "@/components/editor/TiptapEditor";
import {
  getAdminArticle,
  updateArticle,
  deleteArticle,
  getCategories,
  getTags,
  publishArticle,
  unpublishArticle,
} from "@/lib/api/articles";
import type { Article } from "@/types";

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface Tag {
  id: number;
  name: string;
  slug: string;
}

export default function EditArticlePage() {
  const params = useParams();
  const router = useRouter();
  const articleId = Number(params.id);

  const [article, setArticle] = useState<Article | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const [articleRes, categoriesRes, tagsRes] = await Promise.all([
          getAdminArticle(articleId),
          getCategories(),
          getTags(),
        ]);

        if (articleRes.success && articleRes.data) {
          const art = articleRes.data;
          setArticle(art);
          setTitle(art.title);
          setSummary(art.summary || "");
          setContent(art.content);
          setCoverImage(art.coverImage || "");
          setCategoryId(art.category?.id);
          setSelectedTags(art.tags?.map((t) => t.id) || []);
        } else {
          setError("找不到文章");
        }

        if (categoriesRes.success && categoriesRes.data) {
          setCategories(categoriesRes.data);
        }
        if (tagsRes.success && tagsRes.data) {
          setTags(tagsRes.data);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
        setError("載入資料失敗");
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [articleId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!title.trim()) {
      setError("請輸入標題");
      return;
    }

    if (!content.trim()) {
      setError("請輸入內容");
      return;
    }

    setIsSaving(true);

    try {
      const response = await updateArticle(articleId, {
        title,
        summary: summary || undefined,
        content,
        coverImage: coverImage || undefined,
        categoryId,
        tagIds: selectedTags,
      });

      if (response.success && response.data) {
        setArticle(response.data);
        setSuccessMessage("儲存成功");
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        setError(response.message || "更新文章失敗");
      }
    } catch (error) {
      console.error("Failed to update article:", error);
      setError("發生錯誤，請稍後再試");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!article) return;

    try {
      const response = await publishArticle(article.id);
      if (response.success && response.data) {
        setArticle(response.data);
        setSuccessMessage("文章已發佈");
        setTimeout(() => setSuccessMessage(""), 3000);
      }
    } catch (error) {
      console.error("Failed to publish article:", error);
      setError("發佈失敗");
    }
  };

  const handleUnpublish = async () => {
    if (!article) return;

    try {
      const response = await unpublishArticle(article.id);
      if (response.success && response.data) {
        setArticle(response.data);
        setSuccessMessage("文章已取消發佈");
        setTimeout(() => setSuccessMessage(""), 3000);
      }
    } catch (error) {
      console.error("Failed to unpublish article:", error);
      setError("取消發佈失敗");
    }
  };

  const handleDelete = async () => {
    if (!article) return;
    if (!window.confirm(`確定要刪除「${article.title}」？此操作無法復原。`)) return;

    setIsDeleting(true);
    try {
      const response = await deleteArticle(article.id);
      if (response.success) {
        router.push("/admin/articles");
      } else {
        setError("刪除失敗");
        setIsDeleting(false);
      }
    } catch {
      setError("刪除時發生錯誤");
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    router.push("/admin/articles");
  };

  const handlePreview = () => {
    window.open(`/articles/${articleId}`, "_blank");
  };

  const handleTagToggle = (tagId: number) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-text-muted">載入中...</p>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted mb-4">{error || "找不到文章"}</p>
        <Link href="/admin/articles" className="text-primary hover:underline">
          返回文章列表
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/articles"
            className="text-text-muted hover:text-text"
          >
            ← 返回列表
          </Link>
          <h1 className="text-2xl font-heading font-bold text-text">
            編輯文章
          </h1>
          {getStatusBadge(article.status)}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-6 p-3 bg-red-900/30 border border-red-500/50 rounded-md text-red-400 text-sm">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-3 bg-green-900/30 border border-green-500/50 rounded-md text-green-400 text-sm">
            {successMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card">
              <label className="block text-sm font-medium text-text mb-2">
                標題 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input text-lg font-heading"
                placeholder="文章標題"
                disabled={isSaving}
              />
            </div>

            <div className="card">
              <label className="block text-sm font-medium text-text mb-2">
                摘要
              </label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="input min-h-[80px]"
                placeholder="文章摘要 (選填)"
                disabled={isSaving}
              />
            </div>

            <div className="card p-0">
              <div className="px-4 py-3 border-b border-border">
                <label className="block text-sm font-medium text-text">
                  內容 <span className="text-red-500">*</span>
                </label>
              </div>
              <TiptapEditor
                content={content}
                onChange={setContent}
                placeholder="開始撰寫你的文章..."
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            <div className="card">
              <h3 className="font-medium text-text mb-4">操作</h3>
              <div className="space-y-2">
                {/* 儲存 */}
                <button
                  type="submit"
                  className="btn btn-primary w-full"
                  disabled={isSaving || isDeleting}
                >
                  {isSaving ? "儲存中..." : "儲存變更"}
                </button>

                {/* 發佈 / 取消發佈 */}
                {article.status === "draft" || article.status === "scheduled" ? (
                  <button
                    type="button"
                    onClick={handlePublish}
                    className="btn w-full bg-green-900/30 text-green-400 border border-green-500/50 hover:bg-green-900/60"
                    disabled={isSaving || isDeleting}
                  >
                    發佈文章
                  </button>
                ) : article.status === "published" ? (
                  <button
                    type="button"
                    onClick={handleUnpublish}
                    className="btn w-full bg-orange-900/30 text-orange-400 border border-orange-500/50 hover:bg-orange-900/60"
                    disabled={isSaving || isDeleting}
                  >
                    取消發佈（轉草稿）
                  </button>
                ) : null}

                {/* 預覽（新分頁，無需儲存）*/}
                <button
                  type="button"
                  onClick={handlePreview}
                  className="btn btn-outline w-full flex items-center justify-center gap-2"
                  disabled={isDeleting}
                >
                  <span>預覽文章</span>
                  <span className="text-xs opacity-60">↗</span>
                </button>

                {/* 取消 */}
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn btn-outline w-full text-text-muted"
                  disabled={isSaving || isDeleting}
                >
                  取消（返回列表）
                </button>

                {/* 刪除 */}
                <div className="pt-2 border-t border-border">
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="btn w-full bg-red-900/30 text-red-400 border border-red-500/50 hover:bg-red-900/60"
                    disabled={isSaving || isDeleting}
                  >
                    {isDeleting ? "刪除中..." : "刪除文章"}
                  </button>
                </div>
              </div>

              {article.publishedAt && (
                <p className="mt-3 text-xs text-text-muted">
                  發佈於{" "}
                  {new Date(article.publishedAt).toLocaleString("zh-TW")}
                </p>
              )}
            </div>

            {/* Cover Image */}
            <div className="card">
              <h3 className="font-medium text-text mb-4">封面圖片</h3>
              <input
                type="url"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                className="input"
                placeholder="圖片網址"
                disabled={isSaving}
              />
              {coverImage && (
                <img
                  src={coverImage}
                  alt="封面預覽"
                  className="mt-3 rounded-md w-full h-32 object-cover"
                />
              )}
            </div>

            {/* Category */}
            <div className="card">
              <h3 className="font-medium text-text mb-4">分類</h3>
              <select
                value={categoryId || ""}
                onChange={(e) =>
                  setCategoryId(
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
                className="input"
                disabled={isSaving}
              >
                <option value="">選擇分類</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div className="card">
              <h3 className="font-medium text-text mb-4">標籤</h3>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleTagToggle(tag.id)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedTags.includes(tag.id)
                        ? "bg-primary text-white"
                        : "bg-surface text-text-muted hover:bg-secondary"
                    }`}
                    disabled={isSaving}
                  >
                    {tag.name}
                  </button>
                ))}
                {tags.length === 0 && (
                  <p className="text-sm text-text-muted">尚無標籤</p>
                )}
              </div>
            </div>

            {/* Article Info */}
            <div className="card">
              <h3 className="font-medium text-text mb-4">文章資訊</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-text-muted">瀏覽次數</dt>
                  <dd className="text-text">{article.viewCount}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-muted">建立時間</dt>
                  <dd className="text-text">
                    {new Date(article.createdAt).toLocaleDateString("zh-TW")}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-text-muted">更新時間</dt>
                  <dd className="text-text">
                    {article.updatedAt
                      ? new Date(article.updatedAt).toLocaleDateString("zh-TW")
                      : "-"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
