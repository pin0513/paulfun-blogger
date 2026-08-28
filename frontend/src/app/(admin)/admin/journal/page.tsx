"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  getJournalEntries,
  getJournalStats,
  deleteJournalEntry,
} from "@/lib/api/journal";
import type { JournalEntryListItem, JournalStats } from "@/types";
import { COPING_OPTIONS, copingLabel } from "@/components/journal/icebergLayers";

export default function JournalListPage() {
  const [items, setItems] = useState<JournalEntryListItem[]>([]);
  const [stats, setStats] = useState<JournalStats | null>(null);
  const [search, setSearch] = useState("");
  const [coping, setCoping] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([
        getJournalEntries({ search: search || undefined, coping: coping || undefined, pageSize: 50 }),
        getJournalStats(),
      ]);
      if (r.success && r.data) setItems(r.data.items);
      if (s.success && s.data) setStats(s.data);
    } finally {
      setLoading(false);
    }
  }, [search, coping]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const remove = async (id: number) => {
    if (!confirm("刪除這篇覺察紀錄？此操作無法復原。")) return;
    const r = await deleteJournalEntry(id);
    if (r.success) load();
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-heading font-bold text-text">自我覺察日記</h1>
        <Link href="/admin/journal/new" className="btn btn-primary">
          + 新的覺察
        </Link>
      </div>
      <p className="text-sm text-text-muted mb-6">
        只有你看得到。不會出現在部落格，也不會被 API token 讀到。
      </p>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-surface border border-border rounded-lg p-3">
            <div className="text-2xl font-mono text-primary">{stats.total}</div>
            <div className="text-xs text-text-muted">總篇數</div>
          </div>
          <div className="bg-surface border border-border rounded-lg p-3">
            <div className="text-2xl font-mono text-primary">{stats.last30Days}</div>
            <div className="text-xs text-text-muted">近 30 天</div>
          </div>
          <div className="col-span-2 bg-surface border border-border rounded-lg p-3">
            <div className="text-xs text-text-muted mb-1.5">最常出現的應對姿態</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byCoping)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([k, n]) => (
                  <span key={k} className="text-xs px-2 py-0.5 rounded-full border border-border text-text-muted">
                    {copingLabel(k)} {n}
                  </span>
                ))}
              {Object.keys(stats.byCoping).length === 0 && (
                <span className="text-xs text-text-muted">尚無資料</span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-5">
        <input
          className="flex-1 min-w-[200px] bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary"
          placeholder="搜尋標題 / 行為 / 感受 / 覺察…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary"
          value={coping}
          onChange={(e) => setCoping(e.target.value)}
        >
          <option value="">全部姿態</option>
          {COPING_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-sm text-text-muted py-10 text-center">載入中…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-lg">
          <p className="text-text-muted mb-3">還沒有紀錄</p>
          <Link href="/admin/journal/new" className="text-primary hover:underline text-sm">
            寫下第一則覺察 →
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((e) => (
            <li
              key={e.id}
              className="bg-surface border border-border rounded-lg p-4 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <Link href={`/admin/journal/${e.id}`} className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-medium text-text">{e.title}</span>
                    {e.coping && (
                      <span className="text-xs px-2 py-0.5 rounded-full border border-border text-text-muted">
                        {copingLabel(e.coping)}
                      </span>
                    )}
                  </div>
                  {e.excerpt && (
                    <p className="text-sm text-text-muted line-clamp-2">{e.excerpt}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-text-muted font-mono">
                    <span>
                      {new Date(e.occurredAt).toLocaleDateString("zh-TW", {
                        year: "numeric", month: "long", day: "numeric",
                      })}
                    </span>
                    <span title="八層裡填了幾層">深度 {e.depthFilled}/8</span>
                    {e.mood != null && <span>狀態 {e.mood}</span>}
                  </div>
                </Link>
                <button
                  onClick={() => remove(e.id)}
                  className="text-xs text-text-muted hover:text-red-400 shrink-0"
                >
                  刪除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
