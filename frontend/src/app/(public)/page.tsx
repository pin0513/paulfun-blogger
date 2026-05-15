"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getArticles } from "@/lib/api/articles";
import { getStaticImageUrl } from "@/lib/api/media";
import type { ArticleListItem } from "@/types";

export default function HomePage() {
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    async function fetchArticles() {
      setIsLoading(true);
      try {
        const response = await getArticles({
          page,
          pageSize: 9,
          sortBy: "publishedAt",
          descending: true,
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
    }
    fetchArticles();
  }, [page]);

  // IntersectionObserver for card entrance animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-card-enter");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    const cards = document.querySelectorAll("[data-card-animate]");
    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [articles]);

  return (
    <>
      {/* ===== Hero — Light mode: 輕量個人 profile bar（克制 editorial 風） ===== */}
      <section className="dark:hidden border-b border-[var(--color-border)]">
        <div className="container-wide py-12">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
            {/* Avatar — 圓形頭像 */}
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border border-[var(--color-border)] shrink-0">
              <img
                src={getStaticImageUrl("avatar-paul.jpg")}
                alt="Paul Huang"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Profile text */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-2xl md:text-3xl font-medium mb-1 text-[var(--color-text)]">
                Paul Huang
              </h1>
              <p className="label-spaced text-[var(--color-text-muted)] mb-3">
                工程師 · 爸爸 · 羽球愛好者
              </p>
              <p className="text-sm md:text-base leading-relaxed text-[var(--color-text-secondary)] max-w-xl">
                技術深潛、生活紀錄，記錄人生的每個精彩時刻。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Hero — Dark mode: Cyberpunk profile (保留現狀) ===== */}
      <section className="relative h-[300px] md:h-[400px] overflow-hidden hidden dark:block">
        <img
          src={getStaticImageUrl("blog-bg-image2026.jpg")}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-[#0A0A0F]" />
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary/60 shadow-lg mb-4">
            <img
              src={getStaticImageUrl("avatar-paul.jpg")}
              alt="Paul Huang"
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-3xl md:text-4xl font-heading font-bold mb-2 text-white">
            Paul Huang
          </h1>
          <p className="text-base text-white/70 mb-2">
            工程師 · 爸爸 · 羽球愛好者
          </p>
          <p className="text-sm text-white/50 max-w-md">
            技術深潛、生活紀錄、記錄人生的每個精彩時刻
          </p>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-16" style={{ background: "var(--color-surface)" }}>
        <div className="container-wide">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Text */}
            <div className="order-2 md:order-1">
              <h2 className="text-2xl font-heading font-bold mb-4" style={{ color: "var(--color-primary)" }}>
                關於 Paul
              </h2>
              <div className="space-y-4" style={{ color: "var(--color-text-secondary)" }}>
                <p>
                  嗨，我是保羅！一個熱愛技術的工程師，同時也是兩個孩子的爸。
                </p>
                <p>
                  在這裡分享技術心得、開發筆記，以及生活的點點滴滴。從程式碼到育兒經，從羽球場到咖啡廳，記錄每一個值得回味的時刻。
                </p>
                <div className="flex items-center gap-4 pt-2">
                  <a
                    href="https://bio.paulfun.net"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary text-sm"
                  >
                    More about me &rarr;
                  </a>
                  <a
                    href="https://www.facebook.com/pin0513"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium hover:opacity-80 transition-opacity"
                    style={{ color: "var(--color-primary)" }}
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    Facebook
                  </a>
                </div>
              </div>
            </div>

            {/* Image - son */}
            <div className="order-1 md:order-2">
              <img
                src={getStaticImageUrl("mido-baby-img.jpg")}
                alt="Paul 的兒子"
                className="w-full aspect-[4/3] object-cover rounded-xl shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="py-16">
        <div className="container-wide">
          {/* Section heading — light: editorial 單線 / dark: 漸層線 */}
          <div className="dark:hidden mb-10 pb-3 border-b border-[var(--color-border)]">
            <h2 className="text-xl font-medium text-[var(--color-text)]">
              最新文章
            </h2>
          </div>
          <div className="hidden dark:flex items-center gap-4 mb-10">
            <div className="h-px flex-1 bg-gradient-to-r from-primary/50 to-transparent" />
            <h2 className="text-xl font-heading font-semibold text-[var(--color-text)]">
              最新文章
            </h2>
            <div className="h-px flex-1 bg-gradient-to-l from-primary/50 to-transparent" />
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card animate-pulse">
                  <div className="h-4 rounded w-1/4 mb-3" style={{ background: "var(--color-bg)" }} />
                  <div className="h-6 rounded w-3/4 mb-2" style={{ background: "var(--color-bg)" }} />
                  <div className="h-4 rounded w-full mb-4" style={{ background: "var(--color-bg)" }} />
                  <div className="h-3 rounded w-1/3" style={{ background: "var(--color-bg)" }} />
                </div>
              ))}
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4 opacity-30">{"</>"}</div>
              <p className="text-lg text-[var(--color-text-muted)]">尚無文章</p>
              <p className="text-sm mt-2 text-[var(--color-text-muted)]">
                第一篇文章即將發佈...
              </p>
            </div>
          ) : (
            <>
              {/* Featured (first article) — 報紙頭版頭條風（純文字版） */}
              {articles.length > 0 && (
                <Link
                  href={`/articles/${articles[0].id}`}
                  className="block mb-12"
                >
                  <article className="editorial-card p-8 md:p-10 group hover:-translate-y-1 transition-transform duration-300">
                    {/* Meta — 分類 + 日期（label-spaced） */}
                    <div className="flex items-center gap-3 mb-4">
                      {articles[0].category && (
                        <span className="label-spaced text-[var(--color-category)]">
                          {articles[0].category.name}
                        </span>
                      )}
                      <span className="label-spaced text-[var(--color-text-muted)]">
                        {articles[0].publishedAt
                          ? new Date(articles[0].publishedAt).toLocaleDateString("zh-TW")
                          : ""}
                      </span>
                    </div>

                    {/* 標題 — 較大但不戲劇化 */}
                    <h3 className="text-2xl md:text-3xl font-medium mb-4 leading-tight group-hover:text-[var(--color-primary)] transition-colors text-[var(--color-text)] dark:font-heading dark:font-bold">
                      {articles[0].title}
                    </h3>

                    {articles[0].summary && (
                      <p className="leading-relaxed line-clamp-3 text-[var(--color-text-secondary)]">
                        {articles[0].summary}
                      </p>
                    )}

                    <div className="mt-5 pt-4 border-t border-[var(--color-border)] flex items-center justify-between text-[var(--color-meta)]">
                      <span className="label-spaced">By {articles[0].author.displayName}</span>
                      <span className="text-xs">{articles[0].viewCount} views</span>
                    </div>
                  </article>
                </Link>
              )}

              {/* Rest of articles */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.slice(1).map((article, index) => (
                  <div
                    key={article.id}
                    data-card-animate
                    style={{ opacity: 0, animationDelay: `${index * 80}ms` }}
                  >
                    <ArticleCard article={article} />
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-12 flex justify-center gap-3">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn btn-outline disabled:opacity-30"
                  >
                    &larr; 上一頁
                  </button>
                  <span className="px-4 py-2 font-mono text-sm" style={{ color: "var(--color-text-muted)" }}>
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="btn btn-outline disabled:opacity-30"
                  >
                    下一頁 &rarr;
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}

function ArticleCard({ article }: { article: ArticleListItem }) {
  return (
    <Link href={`/articles/${article.id}`}>
      <article className="editorial-card h-full flex flex-col group hover:-translate-y-1 transition-transform duration-300">
        {/*
          ╔══════════════════════════════════════════════════════════════════╗
          ║  TODO — 由你決定卡片內部排版（5-10 行）                          ║
          ║                                                                  ║
          ║  這是 light mode 報紙卡片的「個性表達」區。可用的工具：          ║
          ║                                                                  ║
          ║  1. .label-spaced       — 11px / uppercase / letter-spacing 1.5px ║
          ║                            （適合分類、日期、author）            ║
          ║  2. .font-masthead      — Noto Serif TC 報紙字（適合標題）       ║
          ║  3. .divider-double     — 3px double 雙線分隔                    ║
          ║  4. CSS vars: --color-text / -secondary / -muted / -primary       ║
          ║                                                                  ║
          ║  關鍵決策：                                                      ║
          ║  • 標題用 font-masthead serif 還是 huninn 圓體？                 ║
          ║  • 分類 / 日期 / author 哪個放前？資訊優先級？                    ║
          ║  • tags 要保留嗎？報紙風通常不顯示 tags，靠分類即可               ║
          ║  • meta 行用上下排還是橫線左右分？                                ║
          ║                                                                  ║
          ║  可參考的兩種典型布局（擇一或自創）：                            ║
          ║                                                                  ║
          ║  布局 A（NYT 慣例）：                                            ║
          ║    [CATEGORY · DATE]    ← label-spaced 小字                      ║
          ║    Article Title        ← font-masthead 大字                     ║
          ║    summary text...                                               ║
          ║    ─────────                                                     ║
          ║    By Author                                                     ║
          ║                                                                  ║
          ║  布局 B（雜誌風）：                                              ║
          ║    Article Title        ← 大標頂格                               ║
          ║    summary text...                                               ║
          ║    [CATEGORY] · DATE · AUTHOR  ← 一行 meta                       ║
          ║                                                                  ║
          ║  填好以下區塊即可。dark mode 不需處理（CSS vars 自動切換）。     ║
          ╚══════════════════════════════════════════════════════════════════╝
        */}
        <div className="p-5 flex flex-col flex-1">
          {/* Meta — 分類 + 日期 */}
          <div className="flex items-center gap-3 mb-3">
            {article.category && (
              <span className="label-spaced text-[var(--color-category)]">
                {article.category.name}
              </span>
            )}
            <span className="label-spaced text-[var(--color-text-muted)]">
              {article.publishedAt
                ? new Date(article.publishedAt).toLocaleDateString("zh-TW")
                : ""}
            </span>
          </div>

          {/* 標題 — 簡約 medium，dark mode 仍用 cyber heading */}
          <h3 className="text-lg font-medium mb-3 line-clamp-2 transition-colors dark:font-heading dark:font-semibold group-hover:text-[var(--color-primary)] text-[var(--color-text)]">
            {article.title}
          </h3>

          {/* Summary */}
          {article.summary && (
            <p className="text-sm leading-relaxed line-clamp-2 flex-1 text-[var(--color-text-secondary)]">
              {article.summary}
            </p>
          )}

          {/* 底部 author / views — 報紙署名感 */}
          <div className="mt-4 pt-3 flex items-center justify-between text-[var(--color-meta)] border-t border-[var(--color-border)]">
            <span className="label-spaced">By {article.author.displayName}</span>
            <span className="text-xs">{article.viewCount} views</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
