"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/lib/hooks/useAuth";

const navItems = [
  { href: "/admin", label: "儀表板", icon: "📊" },
  { href: "/admin/articles", label: "文章管理", icon: "📝" },
  { href: "/admin/media", label: "媒體庫", icon: "🖼️" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <ProtectedRoute requireWriter>
      <div className="min-h-screen bg-background">
        {/* Top Navigation */}
        <header className="bg-surface border-b border-border sticky top-0 z-50 backdrop-blur-sm bg-surface/95">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link
                href="/admin"
                className="text-xl font-heading font-bold text-primary text-neon"
              >
                PaulFun Admin
              </Link>
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-2 rounded-md text-sm transition-colors ${
                      pathname === item.href
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-text-muted hover:text-text hover:bg-surface"
                    }`}
                  >
                    <span className="mr-1">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-sm text-text-muted hover:text-primary"
                target="_blank"
              >
                查看網站 ↗
              </Link>
              <div className="flex items-center gap-3">
                <span className="text-sm text-text-muted">
                  {user?.displayName}
                </span>
                <button
                  onClick={logout}
                  className="text-sm text-text-muted hover:text-primary"
                >
                  登出
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Mobile Navigation */}
        <nav className="md:hidden bg-surface border-b border-border px-4 py-2 flex gap-2 overflow-x-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 rounded-md text-sm whitespace-nowrap ${
                pathname === item.href
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-text-muted"
              }`}
            >
              {item.icon} {item.label}
            </Link>
          ))}
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
      </div>
    </ProtectedRoute>
  );
}
