"use client";

import { useState, useEffect } from "react";
import {
  listSATs,
  createSAT,
  updateSAT,
  deleteSAT,
  type SAT,
  type SATCreateResponse,
} from "@/lib/api/sat";
import { useAuth } from "@/lib/hooks/useAuth";

export default function TokensPage() {
  const { user } = useAuth();
  const [tokens, setTokens] = useState<SAT[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newlyCreated, setNewlyCreated] = useState<SATCreateResponse | null>(null);

  const fetchTokens = async () => {
    setIsLoading(true);
    try {
      const res = await listSATs();
      if (res.success && res.data) setTokens(res.data);
    } catch (e) {
      console.error("Failed to list tokens:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  const handleToggleActive = async (sat: SAT) => {
    const verb = sat.isActive ? "停用" : "啟用";
    if (!confirm(`確定要${verb}「${sat.name}」嗎？`)) return;
    try {
      await updateSAT(sat.id, { isActive: !sat.isActive });
      fetchTokens();
    } catch (e) {
      console.error("Failed to toggle:", e);
      alert("操作失敗");
    }
  };

  const handleDelete = async (sat: SAT) => {
    if (!confirm(`確定要刪除「${sat.name}」嗎？\n刪除後使用此 token 換 JWT 將失敗。`)) return;
    try {
      await deleteSAT(sat.id);
      fetchTokens();
    } catch (e) {
      console.error("Failed to delete:", e);
      alert("刪除失敗");
    }
  };

  const formatDate = (s: string | null) => {
    if (!s) return "—";
    return new Date(s).toLocaleString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRelative = (s: string | null) => {
    if (!s) return "從未";
    const diff = Date.now() - new Date(s).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return "剛剛";
    if (min < 60) return `${min} 分鐘前`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} 小時前`;
    const day = Math.floor(hr / 24);
    return `${day} 天前`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-text">Service Account Tokens</h1>
          <p className="text-sm text-text-muted mt-1">
            給 AI agent / CI / 外部 script 使用；換得的 JWT 短壽 1 小時，自動過期
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn btn-primary">
          + 建立新 token
        </button>
      </div>

      {isLoading ? (
        <div className="text-text-muted">載入中…</div>
      ) : tokens.length === 0 ? (
        <div className="bg-surface border border-border rounded-lg p-12 text-center">
          <div className="text-5xl mb-3 opacity-40">🔑</div>
          <p className="text-text-muted">還沒有任何 token</p>
          <p className="text-xs text-text-muted mt-2">
            建立後可以給 AI agent 拿來打 <code>POST /api/auth/ai-login</code> 換 JWT
          </p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-background border-b border-border">
              <tr className="text-left text-xs text-text-muted uppercase tracking-wider">
                <th className="px-4 py-3">名稱</th>
                <th className="px-4 py-3">Prefix</th>
                <th className="px-4 py-3">狀態</th>
                <th className="px-4 py-3">到期</th>
                <th className="px-4 py-3">上次使用</th>
                <th className="px-4 py-3">建立</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tokens.map((sat) => (
                <tr key={sat.id} className="text-sm">
                  <td className="px-4 py-3 font-medium text-text">{sat.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-text-muted">{sat.tokenPrefix}…</td>
                  <td className="px-4 py-3">
                    {sat.isActive ? (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-green-900/40 text-green-400 border border-green-500/30">
                        ✅ 啟用
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-gray-800/50 text-gray-400 border border-gray-600/30">
                        ❌ 停用
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-muted">
                    {sat.expiresAt ? formatDate(sat.expiresAt) : "永久"}
                  </td>
                  <td className="px-4 py-3 text-text-muted">{formatRelative(sat.lastUsedAt)}</td>
                  <td className="px-4 py-3 text-text-muted text-xs">{formatDate(sat.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleToggleActive(sat)}
                      className="text-xs text-text-muted hover:text-primary mr-3"
                    >
                      {sat.isActive ? "停用" : "啟用"}
                    </button>
                    <button
                      onClick={() => handleDelete(sat)}
                      className="text-xs text-text-muted hover:text-red-400"
                    >
                      刪除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && user && (
        <CreateModal
          userId={user.id}
          onClose={() => setShowCreate(false)}
          onCreated={(resp) => {
            setShowCreate(false);
            setNewlyCreated(resp);
            fetchTokens();
          }}
        />
      )}

      {newlyCreated && (
        <RevealOnceModal token={newlyCreated} onClose={() => setNewlyCreated(null)} />
      )}
    </div>
  );
}

// ── Create modal ──────────────────────────────────────────────────

function CreateModal({
  userId,
  onClose,
  onCreated,
}: {
  userId: number;
  onClose: () => void;
  onCreated: (resp: SATCreateResponse) => void;
}) {
  const [name, setName] = useState("");
  const [neverExpires, setNeverExpires] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("名稱必填");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await createSAT({
        name: name.trim(),
        userId,
        expiresAt: neverExpires ? null : (expiresAt ? new Date(expiresAt).toISOString() : null),
      });
      if (res.success && res.data) {
        onCreated(res.data);
      } else {
        setError(res.message || "建立失敗");
      }
    } catch (e) {
      console.error(e);
      setError("建立失敗");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-heading font-bold mb-4">建立 Service Account Token</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-text-muted mb-1">名稱</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：Claude Code、CI 部署 bot"
              className="w-full px-3 py-2 bg-background border border-border rounded text-text focus:outline-none focus:border-primary"
              maxLength={100}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-text-muted mb-2">到期日</label>
            <div className="flex items-center gap-3">
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                disabled={neverExpires}
                className="flex-1 px-3 py-2 bg-background border border-border rounded text-text focus:outline-none focus:border-primary disabled:opacity-40"
              />
              <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={neverExpires}
                  onChange={(e) => setNeverExpires(e.target.checked)}
                />
                永不過期
              </label>
            </div>
          </div>

          {error && <div className="text-sm text-red-400">{error}</div>}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button type="button" onClick={onClose} className="btn btn-outline">取消</button>
          <button type="submit" disabled={submitting} className="btn btn-primary">
            {submitting ? "建立中…" : "建立"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Reveal-once modal（建立成功後一次性顯示明文 token） ──────────

function RevealOnceModal({ token, onClose }: { token: SATCreateResponse; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(token.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement("textarea");
      el.value = token.token;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-surface border border-yellow-500/40 rounded-lg p-6 w-full max-w-2xl">
        <div className="flex items-start gap-3 mb-4">
          <span className="text-2xl">⚠️</span>
          <div>
            <h2 className="text-lg font-heading font-bold text-yellow-400">這個 token 只會顯示一次</h2>
            <p className="text-sm text-text-muted mt-1">
              關閉視窗後永遠看不到。請馬上複製存進密碼管理器或環境變數。
            </p>
          </div>
        </div>

        <div className="bg-background border border-border rounded p-4 mb-4">
          <div className="text-xs text-text-muted mb-2">名稱：{token.name}</div>
          <div className="font-mono text-sm text-text break-all select-all">{token.token}</div>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={handleCopy} className="btn btn-outline">
            {copied ? "✓ 已複製" : "📋 複製"}
          </button>
          <button onClick={onClose} className="btn btn-primary">
            我已存好，關閉
          </button>
        </div>
      </div>
    </div>
  );
}
