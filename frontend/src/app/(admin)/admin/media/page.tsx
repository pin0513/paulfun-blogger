"use client";

import { useState, useEffect, useRef } from "react";
import { getMedia, uploadMedia, deleteMedia, getMediaUrl } from "@/lib/api/media";
import type { Media } from "@/types";

export default function MediaPage() {
  const [mediaList, setMediaList] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMedia = async () => {
    setIsLoading(true);
    try {
      const response = await getMedia({ page, pageSize: 20 });
      if (response.success && response.data) {
        setMediaList(response.data.items);
        setTotalPages(response.data.totalPages);
      }
    } catch (error) {
      console.error("Failed to fetch media:", error);
      setError("載入媒體失敗");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, [page]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("只支援 JPG、PNG、GIF、WebP 格式的圖片");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("檔案大小不能超過 5MB");
      return;
    }

    setError("");
    setIsUploading(true);

    try {
      const response = await uploadMedia(file);
      if (response.success && response.data) {
        setSuccessMessage("上傳成功");
        setTimeout(() => setSuccessMessage(""), 3000);
        fetchMedia();
      } else {
        setError(response.message || "上傳失敗");
      }
    } catch (error) {
      console.error("Failed to upload media:", error);
      setError("上傳失敗，請稍後再試");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("確定要刪除這個檔案嗎？")) return;

    try {
      const response = await deleteMedia(id);
      if (response.success) {
        setSuccessMessage("刪除成功");
        setTimeout(() => setSuccessMessage(""), 3000);
        setSelectedMedia(null);
        fetchMedia();
      } else {
        setError(response.message || "刪除失敗");
      }
    } catch (error) {
      console.error("Failed to delete media:", error);
      setError("刪除失敗，請稍後再試");
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    setSuccessMessage("已複製到剪貼簿");
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-heading font-bold text-text">媒體庫</h1>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className={`btn btn-primary cursor-pointer ${
              isUploading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isUploading ? "上傳中..." : "上傳圖片"}
          </label>
        </div>
      </div>

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
        {/* Media Grid */}
        <div className="lg:col-span-2">
          <div className="card p-4">
            {isLoading ? (
              <div className="text-center py-12 text-text-muted">載入中...</div>
            ) : mediaList.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-text-muted mb-4">尚無媒體檔案</p>
                <label
                  htmlFor="file-upload"
                  className="text-primary hover:underline cursor-pointer"
                >
                  上傳第一張圖片
                </label>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {mediaList.map((media) => (
                    <div
                      key={media.id}
                      onClick={() => setSelectedMedia(media)}
                      className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-colors ${
                        selectedMedia?.id === media.id
                          ? "border-primary"
                          : "border-transparent hover:border-secondary"
                      }`}
                    >
                      <img
                        src={getMediaUrl(media.filePath)}
                        alt={media.fileName}
                        className="w-full h-full object-cover"
                      />
                      {selectedMedia?.id === media.id && (
                        <div className="absolute inset-0 bg-primary/20" />
                      )}
                    </div>
                  ))}
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
              </>
            )}
          </div>
        </div>

        {/* Media Detail */}
        <div className="lg:col-span-1">
          {selectedMedia ? (
            <div className="card">
              <h3 className="font-medium text-text mb-4">檔案資訊</h3>

              <div className="aspect-video rounded-lg overflow-hidden bg-surface mb-4">
                <img
                  src={getMediaUrl(selectedMedia.filePath)}
                  alt={selectedMedia.fileName}
                  className="w-full h-full object-contain"
                />
              </div>

              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-text-muted mb-1">檔案名稱</dt>
                  <dd className="text-text break-all">{selectedMedia.fileName}</dd>
                </div>
                <div>
                  <dt className="text-text-muted mb-1">檔案大小</dt>
                  <dd className="text-text">
                    {formatFileSize(selectedMedia.fileSize)}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-muted mb-1">類型</dt>
                  <dd className="text-text">{selectedMedia.mimeType}</dd>
                </div>
                <div>
                  <dt className="text-text-muted mb-1">上傳時間</dt>
                  <dd className="text-text">
                    {new Date(selectedMedia.createdAt).toLocaleString("zh-TW")}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-muted mb-1">網址</dt>
                  <dd className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={getMediaUrl(selectedMedia.filePath)}
                      className="input text-xs flex-1"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(getMediaUrl(selectedMedia.filePath))
                      }
                      className="btn btn-outline text-xs px-2 py-1"
                    >
                      複製
                    </button>
                  </dd>
                </div>
              </dl>

              <div className="mt-6 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => handleDelete(selectedMedia.id)}
                  className="btn w-full text-red-600 border-red-600 hover:bg-red-50"
                >
                  刪除檔案
                </button>
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="text-center py-8 text-text-muted">
                <p>選擇一個檔案查看詳情</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
