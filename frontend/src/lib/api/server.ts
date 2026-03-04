import type { ApiResponse, Article } from "@/types";

// Server-side API fetch — 用於 Server Components / generateMetadata
// 生產環境使用 Docker 內部網路 (INTERNAL_API_URL)
// 本地開發 fallback 到 NEXT_PUBLIC_API_URL
const API_BASE =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8080";

export async function fetchArticleServer(
  id: string
): Promise<Article | null> {
  try {
    const res = await fetch(`${API_BASE}/api/articles/${id}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json: ApiResponse<Article> = await res.json();
    return json.success && json.data ? json.data : null;
  } catch {
    return null;
  }
}
