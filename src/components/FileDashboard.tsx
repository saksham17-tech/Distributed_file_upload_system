'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, Trash2, RefreshCw, FileIcon } from 'lucide-react';

type Quota = {
  usedBytes: number;
  fileCount: number;
};

type FileRow = {
  id: string;
  filename: string;
  totalSize: number;
  mimeType: string;
  storagePath: string | null;
  createdAt: string;
  downloadUrl: string | null;
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

type Props = {
  compact?: boolean;
  /** When true, list soft-deleted files and show restore/permanent actions */
  isBin?: boolean;
  refreshSignal?: number;
};

export default function FileDashboard({
  compact = false,
  isBin = false,
  refreshSignal = 0,
}: Props) {
  const [quota, setQuota] = useState<Quota | null>(null);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<FileRow | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const listUrl = isBin
        ? '/api/upload/files/list?bin=1'
        : '/api/upload/files/list';
      const [qRes, fRes] = await Promise.all([
        isBin
          ? Promise.resolve(new Response(JSON.stringify({ usedBytes: 0, fileCount: 0 }), { status: 200 }))
          : fetch('/api/upload/usage/quota'),
        fetch(listUrl),
      ]);
      if (!qRes.ok) throw new Error((await qRes.text()) || `Quota ${qRes.status}`);
      if (!fRes.ok) throw new Error((await fRes.text()) || `List ${fRes.status}`);
      setQuota((await qRes.json()) as Quota);
      const f = (await fRes.json()) as FileRow[];
      setFiles(Array.isArray(f) ? f : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [isBin]);

  useEffect(() => {
    refresh();
  }, [refresh, refreshSignal, isBin]);

  async function moveToBin() {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/upload/files/${pending.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error((await res.text()) || 'Move to bin failed');
      setPending(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function deletePermanent() {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/upload/files/${pending.id}?permanent=true`,
        { method: 'DELETE' },
      );
      if (!res.ok) throw new Error((await res.text()) || 'Delete failed');
      setPending(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const usedMb =
    quota != null ? (quota.usedBytes / (1024 * 1024)).toFixed(2) : null;

  return (
    <>
      <section className="rounded-2xl border border-zinc-800/50 bg-zinc-900/70 p-5 shadow-sm backdrop-blur-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="m-0 text-base font-medium text-zinc-100">
            {isBin ? 'Bin' : compact ? 'Recent' : 'My files'}
          </h2>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-800 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

        {!isBin && quota && (
          <p className="mb-4 text-sm text-zinc-500">
            Storage Used: {usedMb} MB
            {quota.fileCount
              ? ` · ${quota.fileCount} file${quota.fileCount === 1 ? '' : 's'}`
              : ''}
          </p>
        )}

        {!loading && files.length === 0 && (
          <p className="py-10 text-center text-sm text-zinc-600">
            No files yet
          </p>
        )}

        <ul className="m-0 list-none p-0">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-3 rounded-xl border-b border-zinc-800/60 py-3 transition-all duration-200 last:border-0 hover:bg-zinc-800/30"
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-zinc-800 text-zinc-400">
                <FileIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className="truncate text-sm font-medium text-zinc-100"
                  title={f.filename}
                >
                  {f.filename}
                </div>
                <div className="mt-0.5 text-xs text-zinc-500">
                  {formatBytes(f.totalSize)}
                  {f.createdAt ? ` · ${formatDate(f.createdAt)}` : ''}
                </div>
              </div>

              {isBin ? (
              <>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch(`/api/upload/files/${f.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'restore' }),
                      });
                      if (!res.ok) throw new Error(await res.text());
                      await refresh();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : String(err));
                    }
                  }}
                  className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition-all duration-200 hover:bg-zinc-800"
                >
                  Restore
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch(
                        `/api/upload/files/${f.id}?permanent=true`,
                        { method: 'DELETE' },
                      );
                      if (!res.ok) throw new Error(await res.text());
                      await refresh();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : String(err));
                    }
                  }}
                  className="rounded-lg bg-red-500/10 px-3 py-1.5 text-sm text-red-500 transition-all duration-200 hover:bg-red-500/20"
                >
                  Delete
                </button>
              </>
            ) : (
              <>
                <a
                  href={`/api/upload/files/${f.id}/download`}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
                  title="Download"
                >
                  <Download className="h-3.5 w-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => setPending(f)}
                  title="Delete"
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:border-red-900 hover:bg-red-950/40 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            </li>
          ))}
        </ul>
      </section>

      {pending && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-zinc-800/60 bg-zinc-900/90 p-6 shadow-2xl backdrop-blur-xl">
            <h3 className="text-lg font-medium text-zinc-50">Delete file</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Are you sure you want to delete this permanently? Your data will
              not be retrieved.
            </p>
            <p className="mt-2 truncate text-sm font-medium text-zinc-200">
              {pending.filename}
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={busy}
                onClick={() => setPending(null)}
                className="rounded-lg border border-zinc-700/80 px-4 py-2 text-sm text-zinc-300 transition-all duration-200 hover:bg-zinc-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={moveToBin}
                className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 transition-all duration-200 hover:bg-white disabled:opacity-50"
              >
                {busy ? '…' : 'Move to Bin'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={deletePermanent}
                className="rounded-lg bg-red-500/10 px-4 py-2 text-sm font-medium text-red-500 transition-all duration-200 hover:bg-red-500/20 disabled:opacity-50"
              >
                {busy ? '…' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
