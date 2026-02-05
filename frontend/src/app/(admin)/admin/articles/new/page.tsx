"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TiptapEditor } from "@/components/editor/TiptapEditor";
import { createArticle, getCategories, getTags } from "@/lib/api/articles";

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

export default function NewArticlePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const [categoriesRes, tagsRes] = await Promise.all([
          getCategories(),
          getTags(),
        ]);
        if (categoriesRes.success && categoriesRes.data) {
          setCategories(categoriesRes.data);
        }
        if (tagsRes.success && tagsRes.data) {
          setTags(tagsRes.data);
        }
      } catch (error) {
        console.error("Failed to fetch categories/tags:", error);
      }
    }
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("請輸入標題");
      return;
    }

    if (!content.trim()) {
      setError("請輸入內容");
      return;
    }

    setIsLoading(true);

    try {
      const response = await createArticle({
        title,
        summary: summary || undefined,
        content,
        coverImage: coverImage || undefined,
        categoryId,
        tagIds: selectedTags,
      });

      if (response.success && response.data) {
        router.push(`/admin/articles/${response.data.id}`);
      } else {
        setError(response.message || "建立文章失敗");
      }
    } catch (error) {
      console.error("Failed to create article:", error);
      setError("發生錯誤，請稍後再試");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTagToggle = (tagId: number) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold text-text">新增文章</h1>
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-6 p-3 bg-red-900/30 border border-red-500/50 rounded-md text-red-400 text-sm">
            {error}
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
                disabled={isLoading}
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
                disabled={isLoading}
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
              <h3 className="font-medium text-text mb-4">發佈</h3>
              <div className="space-y-3">
                <button
                  type="submit"
                  className="btn btn-primary w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "儲存中..." : "儲存草稿"}
                </button>
              </div>
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
                disabled={isLoading}
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
                  setCategoryId(e.target.value ? Number(e.target.value) : undefined)
                }
                className="input"
                disabled={isLoading}
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
                    disabled={isLoading}
                  >
                    {tag.name}
                  </button>
                ))}
                {tags.length === 0 && (
                  <p className="text-sm text-text-muted">尚無標籤</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
