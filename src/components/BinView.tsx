'use client';

import { useCallback, useEffect, useState } from 'react';
import { Trash2, RotateCcw, FileIcon } from 'lucide-react';

type FileRow = {
  id: string;
  filename: string;
  totalSize: number;
  deletedAt: string | null;
  createdAt: string;
};

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export default function BinView() {
  const [files, setFiles] = useState<FileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/upload/files/list?bin=1');
      if (!res.ok) throw new Error((await res.text()) || `List ${res.status}`);
      const data = (await res.json()) as FileRow[];
      setFiles(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function restore(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/upload/files/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore' }),
      });
      if (!res.ok) throw new Error((await res.text()) || 'Restore failed');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  async function deletePermanent(id: string, name: string) {
    if (!window.confirm(`Permanently delete "${name}"? This cannot be undone.`)) {
      return;
    }
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/upload/files/${id}?permanent=true`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error((await res.text()) || 'Delete failed');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-zinc-800/50 bg-zinc-900/70 p-5 backdrop-blur-xl transition-all duration-300">
      <p className="mb-4 text-sm text-zinc-500">
        Soft-deleted files. Restore or delete permanently.
      </p>
      {error && <p className="mb-3 text-sm text-red-400">{error}</p>}
      {loading && (
        <p className="py-8 text-center text-sm text-zinc-600">Loading…</p>
      )}
      {!loading && files.length === 0 && (
        <p className="py-10 text-center text-sm text-zinc-600">Bin is empty</p>
      )}
      <ul className="m-0 list-none p-0">
        {files.map((f) => (
          <li
            key={f.id}
            className="flex items-center gap-3 rounded-xl border-b border-zinc-800/60 py-3 transition-all duration-200 last:border-0 hover:bg-zinc-800/30"
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-zinc-800 text-zinc-500">
              <FileIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-zinc-200">
                {f.filename}
              </div>
              <div className="mt-0.5 text-xs text-zinc-500">
                {formatBytes(f.totalSize)}
                {f.deletedAt ? ` · deleted ${formatDate(f.deletedAt)}` : ''}
              </div>
            </div>
            <button
              type="button"
              disabled={busyId === f.id}
              onClick={() => restore(f.id)}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition-all duration-200 hover:bg-zinc-800 disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restore
            </button>
            <button
              type="button"
              disabled={busyId === f.id}
              onClick={() => deletePermanent(f.id, f.filename)}
              className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 px-3 py-1.5 text-sm text-red-500 transition-all duration-200 hover:bg-red-500/20 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
