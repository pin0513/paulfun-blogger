"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { getCategories } from "@/lib/api/articles";
import { useAuth } from "@/lib/hooks/useAuth";

interface Category {
  id: number;
  name: string;
  slug: string;
}

const navItems = [
  { href: "/", label: "首頁" },
  { href: "/categories", label: "分類", hasDropdown: true },
];

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await getCategories();
        if (res.success && res.data) {
          setCategories(res.data);
        }
      } catch {
        // silent fail
      }
    }
    fetchCategories();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-50 glass">
        <div className="container-wide py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-2xl font-heading font-bold text-primary text-neon tracking-wider"
          >
            PaulFun
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? "text-primary"
                    : "text-text-muted hover:text-primary"
                }`}
              >
                {item.label}
              </Link>
            ))}
            {categories.slice(0, 4).map((cat) => (
              <Link
                key={cat.slug}
                href={`/categories/${cat.slug}`}
                className={`text-sm font-medium transition-colors ${
                  pathname === `/categories/${cat.slug}`
                    ? "text-secondary-300"
                    : "text-text-muted hover:text-secondary-300"
                }`}
              >
                {cat.name}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            {isAuthenticated ? (
              <Link
                href="/admin"
                className="text-sm text-text-muted hover:text-primary transition-colors"
              >
                {user?.displayName}
              </Link>
            ) : (
              <Link href="/login" className="btn btn-outline text-sm px-3 py-1">
                登入
              </Link>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden text-text-muted hover:text-primary p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-surface/95 backdrop-blur-md">
            <nav className="container-wide py-4 flex flex-col gap-3">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`text-sm py-2 ${
                    pathname === item.href
                      ? "text-primary"
                      : "text-text-muted"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              {categories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/categories/${cat.slug}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-sm py-2 text-text-muted hover:text-secondary-300 pl-4"
                >
                  {cat.name}
                </Link>
              ))}
              <div className="border-t border-border pt-3 mt-2">
                {isAuthenticated ? (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm text-text-muted"
                  >
                    後台管理
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm text-primary"
                  >
                    登入
                  </Link>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border bg-surface/50">
        <div className="container-wide py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Brand */}
            <div>
              <h3 className="text-lg font-heading font-bold text-primary mb-3">
                PaulFun
              </h3>
              <p className="text-sm text-text-muted leading-relaxed">
                分享技術心得、開發筆記，以及一切有趣的事物。
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-sm font-medium text-text mb-3">快速連結</h4>
              <div className="space-y-2">
                <Link
                  href="/"
                  className="block text-sm text-text-muted hover:text-primary"
                >
                  首頁
                </Link>
                <Link
                  href="/categories"
                  className="block text-sm text-text-muted hover:text-primary"
                >
                  分類
                </Link>
              </div>
            </div>

            {/* Tech */}
            <div>
              <h4 className="text-sm font-medium text-text mb-3">技術棧</h4>
              <div className="flex flex-wrap gap-2">
                {["Next.js", ".NET 8", "Tiptap", "TailwindCSS"].map((tech) => (
                  <span
                    key={tech}
                    className="px-2 py-1 text-xs rounded bg-background border border-border text-text-muted"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-border text-center">
            <p className="text-xs text-text-muted">
              &copy; {new Date().getFullYear()} PaulFun Blogger. Built with passion.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
