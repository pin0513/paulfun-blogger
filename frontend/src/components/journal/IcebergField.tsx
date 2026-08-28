"use client";

import { useState } from "react";
import type { IcebergField as FieldDef } from "./icebergFields";

interface Props {
  field: FieldDef;
  values: string[];
  favorites: string[];
  onChange: (next: string[]) => void;
}

/** 單一冰山層：已選 chips + 情境分頁 + 分組選項 + 最近用過 + 自訂輸入 + 語音。 */
export function IcebergField({ field, values, favorites, onChange }: Props) {
  const [scope, setScope] = useState<string>(field.scopes?.[0]?.key ?? "");
  const [custom, setCustom] = useState("");
  const [listening, setListening] = useState(false);

  const toggle = (v: string) =>
    onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);

  const addCustom = () => {
    const v = custom.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setCustom("");
  };

  // 語音輸入：設計稿用 zh-TW 的 Web Speech API。不支援的瀏覽器不顯示按鈕。
  const voiceSupported =
    typeof window !== "undefined" &&
    !!((window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition);

  const startVoice = () => {
    const W = window as unknown as Record<string, unknown>;
    const SR = (W.SpeechRecognition || W.webkitSpeechRecognition) as
      | (new () => {
          lang: string;
          interimResults: boolean;
          continuous: boolean;
          onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
          onend: () => void;
          start: () => void;
          stop: () => void;
        })
      | undefined;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "zh-TW";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (ev) => {
      let text = "";
      for (let i = 0; i < ev.results.length; i++) text += ev.results[i][0].transcript;
      setCustom(text);
    };
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  };

  const scopeOptions =
    field.scopes?.find((s) => s.key === scope)?.options ?? [];
  const unusedFavs = favorites.filter((f) => !values.includes(f));

  const chip = (v: string, active: boolean) => (
    <button
      key={v}
      type="button"
      onClick={() => toggle(v)}
      className="px-2.5 py-1 rounded-full text-[13px] border transition-colors"
      style={
        active
          ? { borderColor: field.color, color: "#fff", background: field.color }
          : { borderColor: "var(--color-border)", color: "var(--color-text-muted)" }
      }
    >
      {v}
    </button>
  );

  return (
    <section
      className="pl-4 py-4 border-l-[3px]"
      style={{ borderColor: field.color }}
    >
      <div className="flex items-baseline gap-2 flex-wrap mb-1">
        <h3 className="text-base font-medium" style={{ color: field.color }}>
          {field.label}
        </h3>
        <span className="text-[10px] font-mono tracking-widest text-text-muted">
          {field.en}
        </span>
        {values.length > 0 && (
          <span className="text-[11px] font-mono text-text-muted">
            已選 {values.length}
          </span>
        )}
      </div>
      <p className="text-xs text-text-muted mb-3 leading-relaxed">{field.hint}</p>

      {/* 已選 */}
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {values.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => toggle(v)}
              className="px-2.5 py-1 rounded-full text-[13px] text-white inline-flex items-center gap-1.5"
              style={{ background: field.color }}
              title="點擊移除"
            >
              {v}
              <span className="opacity-70">×</span>
            </button>
          ))}
        </div>
      )}

      {/* 行為層：情境分頁 */}
      {field.scopes && (
        <div className="flex flex-wrap gap-1 mb-2">
          {field.scopes.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setScope(s.key)}
              className={`px-2 py-0.5 rounded text-[12px] transition-colors ${
                scope === s.key ? "font-medium" : "text-text-muted"
              }`}
              style={
                scope === s.key
                  ? { color: field.color, background: `${field.color}1a` }
                  : undefined
              }
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* 選項 */}
      <div className="space-y-2.5">
        {field.scopes && (
          <div className="flex flex-wrap gap-1.5">
            {scopeOptions.map((v) => chip(v, values.includes(v)))}
          </div>
        )}
        {field.groups?.map((g) => (
          <div key={g.label}>
            <div className="text-[11px] text-text-muted mb-1">{g.label}</div>
            <div className="flex flex-wrap gap-1.5">
              {g.options.map((v) => chip(v, values.includes(v)))}
            </div>
          </div>
        ))}
      </div>

      {/* 最近用過 */}
      {unusedFavs.length > 0 && (
        <div className="mt-3">
          <div className="text-[11px] text-text-muted mb-1">最近用過</div>
          <div className="flex flex-wrap gap-1.5">
            {unusedFavs.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => toggle(v)}
                className="px-2.5 py-1 rounded-full text-[13px] border border-dashed transition-colors hover:opacity-80"
                style={{ borderColor: field.color, color: field.color }}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 自訂 */}
      <div className="flex gap-2 mt-3">
        <input
          className="flex-1 bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none"
          style={{ borderColor: custom ? field.color : undefined }}
          placeholder={field.placeholder}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCustom();
            }
          }}
        />
        {voiceSupported && (
          <button
            type="button"
            onClick={startVoice}
            title="語音輸入"
            className={`px-2.5 rounded-md border text-sm transition-colors ${
              listening ? "animate-pulse" : ""
            }`}
            style={{
              borderColor: listening ? field.color : "var(--color-border)",
              color: listening ? field.color : "var(--color-text-muted)",
            }}
          >
            🎤
          </button>
        )}
        <button
          type="button"
          onClick={addCustom}
          disabled={!custom.trim()}
          className="px-3 rounded-md border text-sm disabled:opacity-40"
          style={{ borderColor: field.color, color: field.color }}
        >
          加入
        </button>
      </div>
    </section>
  );
}
