"use client";

import type { JournalDay } from "@/types";

const WD = ["日", "一", "二", "三", "四", "五", "六"];

export const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

interface Props {
  cursor: { y: number; m: number };
  selected: string;
  today: string;
  days: Record<string, JournalDay>;
  onSelect: (date: string) => void;
  onCursor: (c: { y: number; m: number }) => void;
}

export function JournalCalendar({
  cursor, selected, today, days, onSelect, onCursor,
}: Props) {
  const first = new Date(cursor.y, cursor.m, 1);
  const lead = first.getDay();
  const total = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array(lead).fill(null),
    ...Array.from({ length: total }, (_, i) => isoDate(new Date(cursor.y, cursor.m, i + 1))),
  ];
  const shift = (n: number) => {
    const d = new Date(cursor.y, cursor.m + n, 1);
    onCursor({ y: d.getFullYear(), m: d.getMonth() });
  };

  return (
    <div className="bg-surface border border-border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => shift(-1)} className="px-2 py-1 text-text-muted hover:text-primary text-sm">←</button>
        <span className="text-sm font-medium text-text">
          {cursor.y} 年 {cursor.m + 1} 月
        </span>
        <button onClick={() => shift(1)} className="px-2 py-1 text-text-muted hover:text-primary text-sm">→</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WD.map((w) => (
          <div key={w} className="text-[11px] text-text-muted py-1">{w}</div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const info = days[d];
          const isSel = d === selected;
          const isToday = d === today;
          return (
            <button
              key={d}
              onClick={() => onSelect(d)}
              title={info ? `${info.depthFilled}/8 層　${info.preview.join("、")}` : undefined}
              className={`aspect-square rounded-md text-sm flex flex-col items-center justify-center transition-colors ${
                isSel ? "bg-primary/15 text-primary font-medium"
                      : "text-text-muted hover:bg-surface hover:text-text"
              }`}
              style={isToday && !isSel ? { boxShadow: "inset 0 0 0 1px var(--color-border)" } : undefined}
            >
              <span>{Number(d.slice(-2))}</span>
              {/* 深度用點數表示：挖得越深點越多，一眼看出哪幾天有真的往下走 */}
              {info && (
                <span className="flex gap-[2px] mt-0.5">
                  {Array.from({ length: Math.min(4, Math.ceil(info.depthFilled / 2)) }).map((_, k) => (
                    <span key={k} className="w-1 h-1 rounded-full bg-primary/70" />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
