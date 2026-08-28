"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createJournalEntry,
  updateJournalEntry,
  type UpsertJournalRequest,
} from "@/lib/api/journal";
import type { JournalEntry, CopingStance } from "@/types";
import { ICEBERG_LAYERS, COPING_OPTIONS } from "./icebergLayers";

type Fields = Omit<UpsertJournalRequest, "occurredAt"> & { occurredAt: string };

const emptyFields = (): Fields => ({
  occurredAt: new Date().toISOString().slice(0, 16),
  title: "",
  behavior: "",
  coping: null,
  feeling: "",
  feelingAbout: "",
  viewpoint: "",
  expectation: "",
  yearning: "",
  self: "",
  insight: "",
  nextAction: "",
  mood: null,
  tags: "",
});

export function JournalForm({ entry }: { entry?: JournalEntry }) {
  const router = useRouter();
  const [f, setF] = useState<Fields>(() =>
    entry
      ? {
          occurredAt: new Date(entry.occurredAt).toISOString().slice(0, 16),
          title: entry.title,
          behavior: entry.behavior ?? "",
          coping: entry.coping ?? null,
          feeling: entry.feeling ?? "",
          feelingAbout: entry.feelingAbout ?? "",
          viewpoint: entry.viewpoint ?? "",
          expectation: entry.expectation ?? "",
          yearning: entry.yearning ?? "",
          self: entry.self ?? "",
          insight: entry.insight ?? "",
          nextAction: entry.nextAction ?? "",
          mood: entry.mood ?? null,
          tags: entry.tags ?? "",
        }
      : emptyFields()
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof Fields, v: unknown) =>
    setF((p) => ({ ...p, [k]: v }) as Fields);

  const depth = ICEBERG_LAYERS.filter((l) => {
    const v = f[l.key as keyof Fields];
    return typeof v === "string" ? v.trim() !== "" : !!v;
  }).length;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.title.trim()) {
      setError("標題不可為空");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload: UpsertJournalRequest = {
        ...f,
        occurredAt: new Date(f.occurredAt).toISOString(),
        coping: f.coping || null,
        mood: f.mood || null,
      };
      const res = entry
        ? await updateJournalEntry(entry.id, payload)
        : await createJournalEntry(payload);
      if (res.success) {
        router.push("/admin/journal");
      } else {
        setError(res.message || "儲存失敗");
      }
    } catch {
      setError("儲存失敗，請稍後再試");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full bg-background border border-border rounded-md px-3 py-2 text-sm " +
    "focus:outline-none focus:border-primary transition-colors";

  return (
    <form onSubmit={submit} className="max-w-3xl mx-auto pb-16">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-text">
            {entry ? "編輯覺察" : "新的覺察"}
          </h1>
          <p className="text-sm text-text-muted mt-1">
            挖到第 {depth} / 8 層
            {depth > 0 && depth < 4 && "　—　多數人停在感受這層就不往下了"}
          </p>
        </div>
        <Link href="/admin/journal" className="text-sm text-text-muted hover:text-primary">
          ← 返回
        </Link>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-md text-sm bg-red-500/10 text-red-400 border border-red-500/30">
          {error}
        </div>
      )}

      {/* 基本 */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-4 mb-8">
        <div>
          <label className="block text-xs text-text-muted mb-1.5">一句話標題 *</label>
          <input
            className={inputCls}
            value={f.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="例：飯糰事件"
          />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1.5">發生時間</label>
          <input
            type="datetime-local"
            className={inputCls}
            value={f.occurredAt}
            onChange={(e) => set("occurredAt", e.target.value)}
          />
        </div>
      </div>

      {/* 冰山 */}
      <div className="relative">
        {ICEBERG_LAYERS.map((layer, i) => {
          const isWaterline = i === 2;
          return (
            <div key={layer.key}>
              {isWaterline && (
                <div className="flex items-center gap-3 my-6">
                  <div className="h-px flex-1 bg-primary/40" />
                  <span className="text-xs font-mono text-primary/70 whitespace-nowrap">
                    ～ 水面 ～ 以下是別人看不到的 ～
                  </span>
                  <div className="h-px flex-1 bg-primary/40" />
                </div>
              )}
              <div
                className="mb-5 pl-4 border-l-2"
                style={{
                  borderColor: layer.above
                    ? "var(--color-border)"
                    : `rgba(0,212,255,${0.15 + i * 0.09})`,
                  marginLeft: layer.above ? 0 : (i - 1) * 8,
                }}
              >
                <label className="block text-sm font-medium text-text mb-1">
                  {layer.label}
                </label>
                <p className="text-xs text-text-muted mb-2 leading-relaxed">
                  {layer.hint}
                </p>
                {"select" in layer && layer.select ? (
                  <div className="flex flex-wrap gap-2">
                    {COPING_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        title={o.desc}
                        onClick={() =>
                          set("coping", f.coping === o.value ? null : (o.value as CopingStance))
                        }
                        className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                          f.coping === o.value
                            ? "border-primary text-primary bg-primary/10"
                            : "border-border text-text-muted hover:text-text"
                        }`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <textarea
                    rows={layer.key === "behavior" ? 3 : 2}
                    className={inputCls + " resize-y"}
                    value={(f[layer.key as keyof Fields] as string) ?? ""}
                    onChange={(e) => set(layer.key as keyof Fields, e.target.value)}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 收尾 */}
      <div className="mt-10 pt-6 border-t border-border">
        <h2 className="text-sm font-medium text-text mb-4">收尾</h2>
        <div className="mb-5">
          <label className="block text-xs text-text-muted mb-1.5">我覺察到什麼</label>
          <textarea
            rows={2}
            className={inputCls + " resize-y"}
            value={f.insight ?? ""}
            onChange={(e) => set("insight", e.target.value)}
          />
        </div>
        <div className="mb-5">
          <label className="block text-xs text-text-muted mb-1.5">
            下次可以怎麼做（要具體到做得出來）
          </label>
          <textarea
            rows={2}
            className={inputCls + " resize-y"}
            value={f.nextAction ?? ""}
            onChange={(e) => set("nextAction", e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-text-muted mb-1.5">當下狀態</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => set("mood", f.mood === n ? null : n)}
                  className={`w-10 h-10 rounded-md border text-sm transition-colors ${
                    f.mood === n
                      ? "border-primary text-primary bg-primary/10"
                      : "border-border text-text-muted hover:text-text"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1.5">標籤（逗號分隔）</label>
            <input
              className={inputCls}
              value={f.tags ?? ""}
              onChange={(e) => set("tags", e.target.value)}
              placeholder="教養, 工作"
            />
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-3">
        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving ? "儲存中…" : entry ? "更新" : "記錄下來"}
        </button>
        <Link href="/admin/journal" className="text-sm text-text-muted hover:text-text">
          取消
        </Link>
      </div>
    </form>
  );
}
