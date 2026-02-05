"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  getAdminArticles,
  getCategories,
  getTags,
  deleteArticle,
  publishArticle,
  unpublishArticle,
} from "@/lib/api/articles";
import type { ArticleListItem } from "@/types";

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

interface DashboardStats {
  totalArticles: number;
  publishedCount: number;
  draftCount: number;
  scheduledCount: number;
  totalViews: number;
  categoryCount: number;
  tagCount: number;
}

interface CategoryStat {
  name: string;
  count: number;
  views: number;
}

interface MonthStat {
  month: string;
  articles: number;
  views: number;
}

const CHART_COLORS = {
  primary: "#00D4FF",
  secondary: "#7C3AED",
  accent: "#FF006E",
  green: "#00FF88",
  surface: "#1A1A2E",
  border: "#27273A",
  text: "#71717A",
};

const PIE_COLORS = ["#00D4FF", "#7C3AED", "#FF006E"];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalArticles: 0,
    publishedCount: 0,
    draftCount: 0,
    scheduledCount: 0,
    totalViews: 0,
    categoryCount: 0,
    tagCount: 0,
  });
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthStat[]>([]);
  const [topArticles, setTopArticles] = useState<ArticleListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [allArticlesRes, publishedRes, draftRes, categoriesRes, tagsRes] =
          await Promise.all([
            getAdminArticles({ pageSize: 100 }),
            getAdminArticles({ status: "published", pageSize: 100 }),
            getAdminArticles({ status: "draft", pageSize: 100 }),
            getCategories(),
            getTags(),
          ]);

        const allArticles = allArticlesRes.success
          ? allArticlesRes.data?.items || []
          : [];
        const publishedArticles = publishedRes.success
          ? publishedRes.data?.items || []
          : [];
        const draftArticles = draftRes.success
          ? draftRes.data?.items || []
          : [];
        const categories: Category[] =
          categoriesRes.success ? categoriesRes.data || [] : [];
        const tags: Tag[] = tagsRes.success ? tagsRes.data || [] : [];

        // Compute stats
        const totalViews = allArticles.reduce(
          (sum, a) => sum + a.viewCount,
          0
        );
        const scheduledCount = allArticles.filter(
          (a) => a.status === "scheduled"
        ).length;

        setStats({
          totalArticles: allArticlesRes.data?.totalCount || allArticles.length,
          publishedCount:
            publishedRes.data?.totalCount || publishedArticles.length,
          draftCount: draftRes.data?.totalCount || draftArticles.length,
          scheduledCount,
          totalViews,
          categoryCount: categories.length,
          tagCount: tags.length,
        });

        setArticles(allArticles);

        // Top articles by views
        const sorted = [...allArticles].sort(
          (a, b) => b.viewCount - a.viewCount
        );
        setTopArticles(sorted.slice(0, 5));

        // Category stats
        const catMap = new Map<string, { count: number; views: number }>();
        categories.forEach((c) => catMap.set(c.name, { count: 0, views: 0 }));
        allArticles.forEach((a) => {
          const catName = a.category?.name || "未分類";
          const existing = catMap.get(catName) || { count: 0, views: 0 };
          catMap.set(catName, {
            count: existing.count + 1,
            views: existing.views + a.viewCount,
          });
        });
        setCategoryStats(
          Array.from(catMap.entries())
            .map(([name, data]) => ({ name, ...data }))
            .filter((c) => c.count > 0)
            .sort((a, b) => b.count - a.count)
        );

        // Monthly publishing stats
        const monthMap = new Map<string, { articles: number; views: number }>();
        allArticles.forEach((a) => {
          if (a.publishedAt) {
            const d = new Date(a.publishedAt);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            const existing = monthMap.get(key) || { articles: 0, views: 0 };
            monthMap.set(key, {
              articles: existing.articles + 1,
              views: existing.views + a.viewCount,
            });
          }
        });
        const monthlyData = Array.from(monthMap.entries())
          .map(([month, data]) => ({ month, ...data }))
          .sort((a, b) => a.month.localeCompare(b.month))
          .slice(-12);
        setMonthlyStats(monthlyData);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  const handlePublish = async (id: number) => {
    try {
      const res = await publishArticle(id);
      if (res.success) {
        setArticles((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: "published" as const } : a))
        );
      }
    } catch (error) {
      console.error("Failed to publish:", error);
    }
  };

  const handleUnpublish = async (id: number) => {
    try {
      const res = await unpublishArticle(id);
      if (res.success) {
        setArticles((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: "draft" as const } : a))
        );
      }
    } catch (error) {
      console.error("Failed to unpublish:", error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("確定要刪除這篇文章嗎？")) return;
    try {
      const res = await deleteArticle(id);
      if (res.success) {
        setArticles((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  // Status badge
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

  // Pie chart data
  const statusPieData = [
    { name: "已發佈", value: stats.publishedCount },
    { name: "草稿", value: stats.draftCount },
    { name: "排程", value: stats.scheduledCount },
  ].filter((d) => d.value > 0);

  // Custom tooltip for dark theme
  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-surface border border-border rounded-lg p-3 shadow-glow text-sm">
        {label && <p className="text-text-muted mb-1">{label}</p>}
        {payload.map((entry, i) => (
          <p key={i} style={{ color: entry.color }}>
            {entry.name}: {entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-surface rounded w-1/3" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card h-80" />
          <div className="card h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-text">
            歡迎回來，{user?.displayName}
          </h1>
          <p className="text-text-muted text-sm mt-1 font-mono">
            {new Date().toLocaleDateString("zh-TW", {
              year: "numeric",
              month: "long",
              day: "numeric",
              weekday: "long",
            })}
          </p>
        </div>
        <Link href="/admin/articles/new" className="btn btn-primary">
          + 新增文章
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="總文章數"
          value={stats.totalArticles}
          icon="doc"
          color="primary"
        />
        <StatCard
          label="已發佈"
          value={stats.publishedCount}
          icon="check"
          color="green"
        />
        <StatCard
          label="草稿"
          value={stats.draftCount}
          icon="edit"
          color="secondary"
        />
        <StatCard
          label="總瀏覽數"
          value={stats.totalViews}
          icon="eye"
          color="accent"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Article Status Pie Chart */}
        <div className="card">
          <h3 className="text-sm font-medium text-text mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            文章狀態分佈
          </h3>
          {statusPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {statusPieData.map((_, index) => (
                    <Cell
                      key={index}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={(value) => (
                    <span className="text-text-muted text-xs">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-text-muted text-sm">
              尚無資料
            </div>
          )}
        </div>

        {/* Category Distribution Bar Chart */}
        <div className="card">
          <h3 className="text-sm font-medium text-text mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-secondary" />
            分類文章數量
          </h3>
          {categoryStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryStats}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={CHART_COLORS.border}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
                  axisLine={{ stroke: CHART_COLORS.border }}
                />
                <YAxis
                  tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
                  axisLine={{ stroke: CHART_COLORS.border }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="count"
                  name="文章數"
                  fill={CHART_COLORS.secondary}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-text-muted text-sm">
              尚無資料
            </div>
          )}
        </div>
      </div>

      {/* Monthly Trend + Top Articles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend Line Chart */}
        <div className="card">
          <h3 className="text-sm font-medium text-text mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent" />
            每月發佈趨勢
          </h3>
          {monthlyStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyStats}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={CHART_COLORS.border}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
                  axisLine={{ stroke: CHART_COLORS.border }}
                />
                <YAxis
                  tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
                  axisLine={{ stroke: CHART_COLORS.border }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="articles"
                  name="文章數"
                  stroke={CHART_COLORS.primary}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS.primary, r: 4 }}
                  activeDot={{ r: 6, fill: CHART_COLORS.primary }}
                />
                <Line
                  type="monotone"
                  dataKey="views"
                  name="瀏覽數"
                  stroke={CHART_COLORS.accent}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS.accent, r: 4 }}
                  activeDot={{ r: 6, fill: CHART_COLORS.accent }}
                />
                <Legend
                  formatter={(value) => (
                    <span className="text-text-muted text-xs">{value}</span>
                  )}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-text-muted text-sm">
              尚無資料
            </div>
          )}
        </div>

        {/* Top Articles by Views */}
        <div className="card">
          <h3 className="text-sm font-medium text-text mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green" />
            熱門文章 Top 5
          </h3>
          {topArticles.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={topArticles.map((a) => ({
                  name:
                    a.title.length > 12
                      ? a.title.substring(0, 12) + "..."
                      : a.title,
                  views: a.viewCount,
                  fullTitle: a.title,
                }))}
                layout="vertical"
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={CHART_COLORS.border}
                />
                <XAxis
                  type="number"
                  tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
                  axisLine={{ stroke: CHART_COLORS.border }}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={120}
                  tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
                  axisLine={{ stroke: CHART_COLORS.border }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="views"
                  name="瀏覽數"
                  fill={CHART_COLORS.green}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-text-muted text-sm">
              尚無資料
            </div>
          )}
        </div>
      </div>

      {/* Category & Tag Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Stats Table */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-text flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-secondary" />
              分類統計
            </h3>
            <span className="text-xs text-text-muted font-mono">
              共 {stats.categoryCount} 個分類
            </span>
          </div>
          {categoryStats.length > 0 ? (
            <div className="space-y-3">
              {categoryStats.map((cat) => (
                <div
                  key={cat.name}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <span className="text-sm text-text">{cat.name}</span>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-text-muted">
                      {cat.count} 篇
                    </span>
                    <span className="text-primary font-mono">
                      {cat.views.toLocaleString()} views
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-muted text-sm">尚無分類資料</p>
          )}
        </div>

        {/* Quick Actions & Info */}
        <div className="card">
          <h3 className="text-sm font-medium text-text mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            快速操作
          </h3>
          <div className="space-y-3">
            <Link
              href="/admin/articles/new"
              className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border hover:border-primary/50 hover:shadow-glow transition-all"
            >
              <span className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                +
              </span>
              <div>
                <span className="text-sm font-medium text-text">撰寫新文章</span>
                <p className="text-xs text-text-muted">開始創作你的新內容</p>
              </div>
            </Link>
            <Link
              href="/admin/articles"
              className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border hover:border-secondary/50 hover:shadow-glow-purple transition-all"
            >
              <span className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary-300">
                {"</>"}
              </span>
              <div>
                <span className="text-sm font-medium text-text">管理文章</span>
                <p className="text-xs text-text-muted">
                  {stats.totalArticles} 篇文章 · {stats.draftCount} 篇草稿
                </p>
              </div>
            </Link>
            <Link
              href="/admin/media"
              className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border hover:border-accent/50 hover:shadow-glow-pink transition-all"
            >
              <span className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                img
              </span>
              <div>
                <span className="text-sm font-medium text-text">媒體庫</span>
                <p className="text-xs text-text-muted">管理上傳的圖片和檔案</p>
              </div>
            </Link>
            <a
              href="/"
              target="_blank"
              className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border hover:border-primary/50 transition-all"
            >
              <span className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm">
                {"↗"}
              </span>
              <div>
                <span className="text-sm font-medium text-text">查看網站</span>
                <p className="text-xs text-text-muted">在新視窗中開啟前台</p>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* Recent Articles with Actions */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-text flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            最近文章
          </h3>
          <Link
            href="/admin/articles"
            className="text-xs text-primary hover:underline"
          >
            查看全部 →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 text-text-muted font-medium">
                  標題
                </th>
                <th className="text-left py-2 text-text-muted font-medium">
                  狀態
                </th>
                <th className="text-left py-2 text-text-muted font-medium">
                  分類
                </th>
                <th className="text-right py-2 text-text-muted font-medium">
                  瀏覽
                </th>
                <th className="text-right py-2 text-text-muted font-medium">
                  日期
                </th>
                <th className="text-right py-2 text-text-muted font-medium">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {articles.slice(0, 10).map((article) => (
                <tr key={article.id} className="hover:bg-background/50">
                  <td className="py-3 pr-4">
                    <Link
                      href={`/admin/articles/${article.id}`}
                      className="text-text hover:text-primary transition-colors truncate block max-w-[250px]"
                    >
                      {article.title}
                    </Link>
                  </td>
                  <td className="py-3">{getStatusBadge(article.status)}</td>
                  <td className="py-3 text-text-muted">
                    {article.category?.name || "-"}
                  </td>
                  <td className="py-3 text-right text-text-muted font-mono">
                    {article.viewCount}
                  </td>
                  <td className="py-3 text-right text-text-muted font-mono text-xs">
                    {article.publishedAt
                      ? new Date(article.publishedAt).toLocaleDateString(
                          "zh-TW"
                        )
                      : "-"}
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/articles/${article.id}`}
                        className="text-xs text-primary hover:underline"
                      >
                        編輯
                      </Link>
                      {article.status === "draft" ? (
                        <button
                          onClick={() => handlePublish(article.id)}
                          className="text-xs text-green-400 hover:underline"
                        >
                          發佈
                        </button>
                      ) : article.status === "published" ? (
                        <button
                          onClick={() => handleUnpublish(article.id)}
                          className="text-xs text-orange-400 hover:underline"
                        >
                          取消
                        </button>
                      ) : null}
                      <button
                        onClick={() => handleDelete(article.id)}
                        className="text-xs text-red-400 hover:underline"
                      >
                        刪除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {articles.length === 0 && (
            <div className="text-center py-8 text-text-muted text-sm">
              尚無文章，
              <Link href="/admin/articles/new" className="text-primary">
                建立第一篇
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* Stat Card Component */
function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: "doc" | "check" | "edit" | "eye";
  color: "primary" | "green" | "secondary" | "accent";
}) {
  const colorMap = {
    primary: {
      bg: "bg-primary/10",
      text: "text-primary",
      shadow: "group-hover:shadow-glow",
    },
    green: {
      bg: "bg-green-500/10",
      text: "text-green-400",
      shadow: "group-hover:shadow-[0_0_20px_rgba(0,255,136,0.3)]",
    },
    secondary: {
      bg: "bg-secondary/10",
      text: "text-secondary-300",
      shadow: "group-hover:shadow-glow-purple",
    },
    accent: {
      bg: "bg-accent/10",
      text: "text-accent",
      shadow: "group-hover:shadow-glow-pink",
    },
  };

  const iconMap = {
    doc: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    check: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    edit: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    eye: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
  };

  const c = colorMap[color];

  return (
    <div
      className={`card group transition-all hover:border-border/80 ${c.shadow}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`w-10 h-10 rounded-lg ${c.bg} ${c.text} flex items-center justify-center`}>
          {iconMap[icon]}
        </span>
      </div>
      <p className="text-2xl font-bold text-text font-mono">
        {value.toLocaleString()}
      </p>
      <p className="text-xs text-text-muted mt-1">{label}</p>
    </div>
  );
}
