"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getCategories, getTags } from "@/lib/api/articles";

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

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [catRes, tagRes] = await Promise.all([
          getCategories(),
          getTags(),
        ]);
        if (catRes.success && catRes.data) setCategories(catRes.data);
        if (tagRes.success && tagRes.data) setTags(tagRes.data);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="container-wide py-12">
      {/* Categories */}
      <section className="mb-16">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-1 h-8 bg-gradient-to-b from-primary to-secondary rounded-full" />
          <h1 className="text-3xl font-heading font-bold text-text">分類</h1>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card animate-pulse h-24" />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <p className="text-text-muted">尚無分類</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <Link key={cat.id} href={`/categories/${cat.slug}`}>
                <div className="card-glow flex items-center gap-4 group">
                  <div className="w-12 h-12 rounded-lg bg-background border border-border flex items-center justify-center text-primary font-mono text-lg group-hover:shadow-glow transition-shadow">
                    {cat.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-text group-hover:text-primary transition-colors">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-text-muted font-mono">
                      /{cat.slug}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Tags */}
      <section>
        <div className="flex items-center gap-4 mb-8">
          <span className="text-2xl text-primary font-mono">#</span>
          <h2 className="text-2xl font-heading font-bold text-text">標籤</h2>
        </div>

        {isLoading ? (
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="h-8 w-20 bg-surface rounded-full animate-pulse"
              />
            ))}
          </div>
        ) : tags.length === 0 ? (
          <p className="text-text-muted">尚無標籤</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {tags.map((tag) => (
              <Link
                key={tag.id}
                href={`/tags/${tag.slug}`}
                className="px-4 py-2 rounded-full border border-border text-sm text-text-muted hover:border-primary hover:text-primary hover:shadow-glow transition-all"
              >
                #{tag.name}
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
