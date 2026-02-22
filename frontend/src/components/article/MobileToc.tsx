"use client";

import { useState, useEffect } from "react";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

export function MobileToc({ content }: { content: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<TocItem[]>([]);

  useEffect(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "text/html");
    const headings = doc.querySelectorAll("h1, h2, h3");
    const tocItems = Array.from(headings).map((h, i) => ({
      id: `heading-${i}`,
      text: h.textContent || "",
      level: parseInt(h.tagName.charAt(1)),
    }));
    setItems(tocItems);
  }, [content]);

  if (items.length === 0) return null;

  function handleClick(id: string) {
    const el = document.querySelector(`[data-toc-id="${id}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setIsOpen(false);
  }

  return (
    <div className="lg:hidden">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-40 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105"
        style={{
          background: "var(--color-surface-elevated)",
          border: "1px solid var(--color-border)",
          color: "var(--color-text)",
        }}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h14" />
        </svg>
      </button>

      {/* Bottom sheet */}
      {isOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsOpen(false)} />
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[60vh] overflow-y-auto rounded-t-2xl p-6 animate-slide-up"
            style={{
              background: "var(--color-surface-elevated)",
              borderTop: "1px solid var(--color-border)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h4
                className="text-sm font-medium font-mono tracking-wider uppercase"
                style={{ color: "var(--color-primary)" }}
              >
                {"// 目錄"}
              </h4>
              <button onClick={() => setIsOpen(false)} style={{ color: "var(--color-text-muted)" }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ul className="space-y-1">
              {items.map((item) => (
                <li key={item.id} style={{ paddingLeft: `${(item.level - 1) * 12}px` }}>
                  <button
                    onClick={() => handleClick(item.id)}
                    className="block w-full text-left text-sm py-2 transition-colors"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {item.text}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
