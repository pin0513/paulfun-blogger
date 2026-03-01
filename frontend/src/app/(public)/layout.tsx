"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { getCategories } from "@/lib/api/articles";
import { useAuth } from "@/lib/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";

interface Category {
  id: number;
  name: string;
  slug: string;
}

const navItems = [
  { href: "/", label: "首頁" },
  { href: "/#about", label: "關於我" },
];

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [mobileCategoryOpen, setMobileCategoryOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

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

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  // Close category dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(e.target as Node)
      ) {
        setCategoryDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle search submit
  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
      setSearchOpen(false);
      setSearchQuery("");
      setMobileMenuOpen(false);
    }
  }

  // Handle ESC to close search
  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setSearchOpen(false);
      setSearchQuery("");
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--color-border)] sticky top-0 z-50 glass">
        <div className="container-wide py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-2xl font-heading font-bold text-neon tracking-wider"
            style={{ color: "var(--color-primary)" }}
          >
            PaulFun
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => {
              const isActive = item.href.startsWith("/#")
                ? pathname === "/"
                : pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium transition-colors ${
                    isActive
                      ? "text-[var(--color-primary)]"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            {/* Category Dropdown */}
            <div className="relative" ref={categoryDropdownRef}>
              <button
                onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                onMouseEnter={() => setCategoryDropdownOpen(true)}
                className={`text-sm font-medium transition-colors flex items-center gap-1 ${
                  pathname.startsWith("/categories")
                    ? "text-[var(--color-primary)]"
                    : "text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                }`}
              >
                分類
                <svg
                  className={`w-3.5 h-3.5 transition-transform ${categoryDropdownOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {categoryDropdownOpen && (
                <div
                  className="absolute top-full left-0 mt-2 w-48 py-2 rounded-lg shadow-lg shadow-black/20"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                  onMouseLeave={() => setCategoryDropdownOpen(false)}
                >
                  <Link
                    href="/categories"
                    onClick={() => setCategoryDropdownOpen(false)}
                    className="block px-4 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
                    style={{ }}
                  >
                    全部分類
                  </Link>
                  <div className="my-1" style={{ borderTop: "1px solid var(--color-border)" }} />
                  {categories.map((cat) => (
                    <Link
                      key={cat.slug}
                      href={`/categories/${cat.slug}`}
                      onClick={() => setCategoryDropdownOpen(false)}
                      className={`block px-4 py-2 text-sm transition-colors ${
                        pathname === `/categories/${cat.slug}`
                          ? "text-secondary-300"
                          : "text-[var(--color-text-muted)] hover:text-secondary-300"
                      }`}
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* Desktop Right: Search + Theme + Auth */}
          <div className="hidden md:flex items-center gap-3">
            {/* Search */}
            {searchOpen ? (
              <form onSubmit={handleSearchSubmit} className="flex items-center">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="搜尋文章..."
                  className="w-56 px-3 py-1.5 text-sm rounded-lg transition-all focus:outline-none focus:ring-1"
                  style={{
                    background: "var(--color-bg)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchQuery("");
                  }}
                  className="ml-2 p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </form>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] p-2 transition-colors"
                title="搜尋"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            )}

            <ThemeToggle />

            {isAuthenticated ? (
              <Link
                href="/admin"
                className="btn btn-outline text-sm px-3 py-1"
              >
                管理後台
              </Link>
            ) : (
              <Link href="/login" className="btn btn-outline text-sm px-3 py-1">
                登入
              </Link>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
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
          <div className="md:hidden border-t border-[var(--color-border)] glass">
            <nav className="container-wide py-4 flex flex-col gap-3">
              {/* Mobile Search */}
              <form onSubmit={handleSearchSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜尋文章..."
                  className="flex-1 px-3 py-2 text-sm rounded-lg focus:outline-none"
                  style={{
                    background: "var(--color-bg)",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text)",
                  }}
                />
                <button
                  type="submit"
                  className="px-3 py-2 text-sm rounded-lg transition-colors"
                  style={{
                    color: "var(--color-primary)",
                    border: "1px solid var(--color-primary)",
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </form>

              {navItems.map((item) => {
                const isActive = item.href.startsWith("/#")
                  ? pathname === "/"
                  : pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`text-sm py-2 ${
                      isActive
                        ? "text-[var(--color-primary)]"
                        : "text-[var(--color-text-muted)]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}

              {/* Mobile Category Collapsible */}
              <div>
                <button
                  onClick={() => setMobileCategoryOpen(!mobileCategoryOpen)}
                  className={`text-sm py-2 w-full text-left flex items-center justify-between ${
                    pathname.startsWith("/categories")
                      ? "text-[var(--color-primary)]"
                      : "text-[var(--color-text-muted)]"
                  }`}
                >
                  分類
                  <svg
                    className={`w-4 h-4 transition-transform ${mobileCategoryOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {mobileCategoryOpen && (
                  <div className="pl-4 flex flex-col gap-1 mt-1">
                    <Link
                      href="/categories"
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-sm py-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                    >
                      全部分類
                    </Link>
                    {categories.map((cat) => (
                      <Link
                        key={cat.slug}
                        href={`/categories/${cat.slug}`}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`text-sm py-1.5 ${
                          pathname === `/categories/${cat.slug}`
                            ? "text-secondary-300"
                            : "text-[var(--color-text-muted)] hover:text-secondary-300"
                        }`}
                      >
                        {cat.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 mt-2 flex items-center justify-between" style={{ borderTop: "1px solid var(--color-border)" }}>
                {isAuthenticated ? (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm text-[var(--color-text-muted)]"
                  >
                    後台管理
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-sm text-[var(--color-primary)]"
                  >
                    登入
                  </Link>
                )}
                <ThemeToggle />
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)]" style={{ backgroundColor: "var(--color-surface)" }}>
        <div className="container-wide py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Brand */}
            <div>
              <h3 className="text-lg font-heading font-bold mb-3" style={{ color: "var(--color-primary)" }}>
                PaulFun
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                分享技術心得、開發筆記，以及一切有趣的事物。
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="text-sm font-medium mb-3" style={{ color: "var(--color-text)" }}>快速連結</h4>
              <div className="space-y-2">
                <Link
                  href="/"
                  className="block text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                >
                  首頁
                </Link>
                <Link
                  href="/categories"
                  className="block text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
                >
                  分類
                </Link>
              </div>
            </div>

            {/* Tech */}
            <div>
              <h4 className="text-sm font-medium mb-3" style={{ color: "var(--color-text)" }}>技術棧</h4>
              <div className="flex flex-wrap gap-2">
                {["Next.js", "Go", "Tiptap", "TailwindCSS"].map((tech) => (
                  <span
                    key={tech}
                    className="px-2 py-1 text-xs rounded"
                    style={{
                      background: "var(--color-bg)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 text-center" style={{ borderTop: "1px solid var(--color-border)" }}>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              &copy; {new Date().getFullYear()} PaulFun Blogger. Built with passion.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
