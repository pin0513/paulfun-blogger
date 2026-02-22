"use client";

import { useState, useEffect } from "react";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  content: string;
}

export function TableOfContents({ content }: TableOfContentsProps) {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    // Parse headings from HTML content
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "text/html");
    const headings = doc.querySelectorAll("h1, h2, h3");

    const tocItems: TocItem[] = Array.from(headings).map((heading, index) => {
      const id = `heading-${index}`;
      return {
        id,
        text: heading.textContent || "",
        level: parseInt(heading.tagName.charAt(1)),
      };
    });

    setItems(tocItems);
  }, [content]);

  useEffect(() => {
    // Observe which heading is in view
    const headingElements = document.querySelectorAll("[data-toc-id]");

    if (headingElements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = (entry.target as HTMLElement).dataset.tocId;
            if (id) setActiveId(id);
          }
        });
      },
      { rootMargin: "-80px 0px -80% 0px" }
    );

    headingElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  const handleClick = (id: string) => {
    const element = document.querySelector(`[data-toc-id="${id}"]`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <nav className="card sticky top-24">
      <h4
        className="text-sm font-medium mb-4 font-mono tracking-wider uppercase"
        style={{ color: "var(--color-primary)" }}
      >
        {"// 目錄"}
      </h4>
      <ul className="space-y-1">
        {items.map((item) => (
          <li
            key={item.id}
            style={{ paddingLeft: `${(item.level - 1) * 12}px` }}
          >
            <button
              onClick={() => handleClick(item.id)}
              className="block w-full text-left text-sm py-1.5 transition-colors border-l-2 pl-3"
              style={{
                borderColor:
                  activeId === item.id
                    ? "var(--color-primary)"
                    : "transparent",
                color:
                  activeId === item.id
                    ? "var(--color-primary)"
                    : "var(--color-text-muted)",
              }}
            >
              {item.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
