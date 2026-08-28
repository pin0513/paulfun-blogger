"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getJournalRange, getJournalDay, upsertJournalDay,
  getJournalStats, getJournalFavorites,
} from "@/lib/api/journal";
import type { JournalEntry, JournalDay, JournalStats } from "@/types";
import { FIELDS } from "@/components/journal/icebergFields";
import { IcebergField } from "@/components/journal/IcebergField";
import { JournalCalendar, isoDate } from "@/components/journal/JournalCalendar";

type Values = Record<string, string[]>;

const emptyValues = (): Values =>
  Object.fromEntries(FIELDS.map((f) => [f.key, [] as string[]]));

export default function JournalPage() {
  const today = isoDate(new Date());
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [selected, setSelected] = useState(today);
  const [values, setValues] = useState<Values>(emptyValues);
  const [note, setNote] = useState("");
  const [days, setDays] = useState<Record<string, JournalDay>>({});
  const [favs, setFavs] = useState<Record<string, string[]>>({});
  const [stats, setStats] = useState<JournalStats | null>(null);
  const [saved, setSaved] = useState("");
  const [loading, setLoading] = useState(true);
  const dirty = useRef(false);

  const loadMonth = useCallback(async () => {
    const from = isoDate(new Date(cursor.y, cursor.m, 1));
    const to = isoDate(new Date(cursor.y, cursor.m + 1, 0));
    const r = await getJournalRange(from, to);
    if (r.success && r.data) {
      setDays(Object.fromEntries(r.data.map((d) => [d.entryDate, d])));
    }
  }, [cursor]);

  const loadSide = useCallback(async () => {
    const [s, f] = await Promise.all([getJournalStats(), getJournalFavorites()]);
    if (s.success && s.data) setStats(s.data);
    if (f.success && f.data) setFavs(f.data);
  }, []);

  useEffect(() => { loadMonth(); }, [loadMonth]);
  useEffect(() => { loadSide(); }, [loadSide]);

  useEffect(() => {
    setLoading(true);
    dirty.current = false;
    getJournalDay(selected)
      .then((r) => {
        if (r.success && r.data) {
          const e = r.data as JournalEntry & Record<string, string[]>;
          setValues(Object.fromEntries(FIELDS.map((f) => [f.key, e[f.key] ?? []])));
          setNote(r.data.note ?? "");
        }
      })
      .finally(() => setLoading(false));
  }, [selected]);

  // 自動儲存：改動後 800ms 沒有新動作才送出，避免每點一個 chip 打一次 API
  useEffect(() => {
    if (!dirty.current || loading) return;
    const t = setTimeout(async () => {
      const payload = { ...(values as unknown as Record<string, string[]>), note };
      const r = await upsertJournalDay(selected, payload as never);
      if (r.success) {
        setSaved(
          "已儲存 " +
            new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })
        );
        loadMonth();
        loadSide();
      }
    }, 800);
    return () => clearTimeout(t);
  }, [values, note, selected, loading, loadMonth, loadSide]);

  const setField = (key: string, next: string[]) => {
    dirty.current = true;
    setValues((v) => ({ ...v, [key]: next }));
  };

  const depth = FIELDS.filter((f) => (values[f.key] ?? []).length > 0).length;

  const exportMd = async () => {
    const r = await fetch("/api/admin/journal/export", {
      headers: {
        Authorization: `Bearer ${JSON.parse(localStorage.getItem("accessToken") || '""')}`,
      },
    });
    if (!r.ok) return;
    const blob = await r.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "自我覺察日記.md";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-1 flex-wrap">
        <div>
          <h1 className="text-2xl font-heading font-bold text-text">自我覺察日記</h1>
          <p className="text-sm text-text-muted mt-1">
            薩提爾冰山 · 一天一篇 · 只有你看得到
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs text-text-muted font-mono">{saved}</span>}
          <button onClick={exportMd} className="text-sm text-text-muted hover:text-primary">
            匯出 Markdown ↓
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 mt-6">
        {/* 左：月曆 + 統計 */}
        <aside className="space-y-4">
          <JournalCalendar
            cursor={cursor} selected={selected} today={today} days={days}
            onSelect={setSelected} onCursor={setCursor}
          />
          {stats && (
            <div className="bg-surface border border-border rounded-lg p-3 space-y-2">
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  ["天數", stats.totalDays],
                  ["近 30 天", stats.last30Days],
                  ["連續", stats.currentStreak],
                ].map(([l, v]) => (
                  <div key={l as string}>
                    <div className="text-lg font-mono text-primary">{v as number}</div>
                    <div className="text-[11px] text-text-muted">{l as string}</div>
                  </div>
                ))}
              </div>
              {(stats.topByField.values ?? []).length > 0 && (
                <div className="pt-2 border-t border-border">
                  <div className="text-[11px] text-text-muted mb-1.5">最常出現的渴望</div>
                  <div className="flex flex-wrap gap-1">
                    {stats.topByField.values.slice(0, 4).map((t) => (
                      <span key={t.value}
                        className="text-[11px] px-2 py-0.5 rounded-full border border-border text-text-muted">
                        {t.value} {t.count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>

        {/* 右：當天的冰山 */}
        <main>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-lg font-medium text-text">
              {selected}
              {selected === today && (
                <span className="ml-2 text-xs text-primary">今天</span>
              )}
            </h2>
            <span className="text-xs text-text-muted font-mono">挖到 {depth} / 8 層</span>
          </div>

          {loading ? (
            <div className="text-sm text-text-muted py-10 text-center">載入中…</div>
          ) : (
            <>
              {FIELDS.map((f, i) => (
                <div key={f.key}>
                  {i === 1 && (
                    <div className="flex items-center gap-3 my-4">
                      <div className="h-px flex-1 bg-primary/30" />
                      <span className="text-[11px] font-mono text-primary/70 whitespace-nowrap">
                        ～ 水面 ～ 以下是別人看不到的 ～
                      </span>
                      <div className="h-px flex-1 bg-primary/30" />
                    </div>
                  )}
                  <IcebergField
                    field={f}
                    values={values[f.key] ?? []}
                    favorites={favs[f.key] ?? []}
                    onChange={(next) => setField(f.key, next)}
                  />
                </div>
              ))}

              <section className="pl-4 py-4 border-l-[3px] border-border">
                <h3 className="text-base font-medium text-text mb-1">自由書寫</h3>
                <p className="text-xs text-text-muted mb-3">
                  選項之外想補的話。也可以留白。
                </p>
                <textarea
                  rows={4}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm resize-y focus:outline-none focus:border-primary"
                  value={note}
                  onChange={(e) => {
                    dirty.current = true;
                    setNote(e.target.value);
                  }}
                />
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
