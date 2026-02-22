"use client";

import { useState, useEffect, useRef } from "react";

type FontSize = "small" | "medium" | "large";

export function FontSizeControl() {
  const [isOpen, setIsOpen] = useState(false);
  const [size, setSize] = useState<FontSize>("medium");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("fontSize") as FontSize | null;
    if (saved && ["small", "medium", "large"].includes(saved)) {
      setSize(saved);
      document.documentElement.setAttribute("data-font-size", saved);
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function changeSize(newSize: FontSize) {
    setSize(newSize);
    localStorage.setItem("fontSize", newSize);
    document.documentElement.setAttribute("data-font-size", newSize);
  }

  return (
    <div ref={ref} className="fixed bottom-6 right-6 z-40">
      {isOpen ? (
        <div
          className="flex items-center gap-1 rounded-full px-2 py-1.5 shadow-lg"
          style={{
            background: "var(--color-surface-elevated)",
            border: "1px solid var(--color-border)",
          }}
        >
          {(["small", "medium", "large"] as FontSize[]).map((s) => (
            <button
              key={s}
              onClick={() => changeSize(s)}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                size === s ? "text-white" : ""
              }`}
              style={{
                background: size === s ? "var(--color-primary)" : undefined,
                color: size === s ? undefined : "var(--color-text-muted)",
              }}
            >
              {s === "small" ? "A-" : s === "medium" ? "A" : "A+"}
            </button>
          ))}
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg text-sm font-semibold transition-all hover:scale-105"
          style={{
            background: "var(--color-surface-elevated)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text)",
          }}
        >
          Aa
        </button>
      )}
    </div>
  );
}
