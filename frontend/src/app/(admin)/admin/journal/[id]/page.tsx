"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getJournalEntry } from "@/lib/api/journal";
import { JournalForm } from "@/components/journal/JournalForm";
import type { JournalEntry } from "@/types";

export default function EditJournalPage() {
  const params = useParams();
  const id = params.id as string;
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getJournalEntry(id)
      .then((r) => {
        if (r.success && r.data) setEntry(r.data);
        else setError("找不到這篇紀錄");
      })
      .catch(() => setError("載入失敗"));
  }, [id]);

  if (error) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <p className="text-text-muted mb-3">{error}</p>
        <Link href="/admin/journal" className="text-primary hover:underline text-sm">
          ← 返回日記
        </Link>
      </div>
    );
  }
  if (!entry) {
    return <div className="text-sm text-text-muted py-10 text-center">載入中…</div>;
  }
  return <JournalForm entry={entry} />;
}
