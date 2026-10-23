'use client';

import { useCallback, useEffect, useState } from 'react';

type Quota = {
  usedBytes: number;
  limitBytes: number;
  remainingBytes: number;
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

export default function FileDashboard() {
  const [quota, setQuota] = useState<Quota | null>(null);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [qRes, fRes] = await Promise.all([
        fetch('/api/upload/usage/quota'),
        fetch('/api/upload/files/list'),
      ]);

      if (!qRes.ok) {
        const t = await qRes.text();
        throw new Error(t || `Quota failed (${qRes.status})`);
      }
      if (!fRes.ok) {
        const t = await fRes.text();
        throw new Error(t || `List failed (${fRes.status})`);
      }

      const q = (await qRes.json()) as Quota;
      const f = (await fRes.json()) as FileRow[];
      setQuota(q);
      setFiles(Array.isArray(f) ? f : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const usedPct = quota
    ? Math.min(100, (quota.usedBytes / quota.limitBytes) * 100)
    : 0;

  return (
    <section
      style={{
        maxWidth: 640,
        margin: '2rem auto',
        padding: '1.5rem',
        borderRadius: 12,
        border: '1px solid #333',
        background: '#111',
        color: '#eee',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Storage &amp; Files</h2>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: 'none',
            background: '#333',
            color: '#fff',
            cursor: loading ? 'wait' : 'pointer',
            fontSize: 13,
          }}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <p style={{ color: '#f66', fontSize: 13, marginBottom: 12 }}>{error}</p>
      )}

      {/* Quota bar */}
      {quota && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 13,
              color: '#aaa',
              marginBottom: 6,
            }}
          >
            <span>
              {formatBytes(quota.usedBytes)} / {formatBytes(quota.limitBytes)}
            </span>
            <span>{usedPct.toFixed(1)}% used</span>
          </div>
          <div
            style={{
              height: 10,
              background: '#222',
              borderRadius: 5,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${usedPct}%`,
                background:
                  usedPct > 90 ? '#e11' : usedPct > 70 ? '#c90' : '#3b82f6',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
          <p style={{ fontSize: 12, color: '#666', marginTop: 6, marginBottom: 0 }}>
            {formatBytes(quota.remainingBytes)} remaining · {quota.fileCount}{' '}
            file(s) counting toward quota
          </p>
        </div>
      )}

      {/* File list */}
      <h3 style={{ fontSize: 14, color: '#aaa', margin: '0 0 0.75rem' }}>
        Completed uploads
      </h3>

      {!loading && files.length === 0 && (
        <p style={{ color: '#666', fontSize: 13 }}>No completed files yet.</p>
      )}

      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {files.map((f) => (
          <li
            key={f.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 0',
              borderBottom: '1px solid #222',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 14,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={f.filename}
              >
                {f.filename}
              </div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                {formatBytes(f.totalSize)}
                {f.createdAt ? ` · ${formatDate(f.createdAt)}` : ''}
              </div>
            </div>
            {f.downloadUrl ? (
              <a
                href={f.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  background: '#3b82f6',
                  color: '#fff',
                  textDecoration: 'none',
                  fontSize: 13,
                  fontWeight: 500,
                  flexShrink: 0,
                }}
              >
                Download
              </a>
            ) : (
              <span style={{ fontSize: 12, color: '#555', flexShrink: 0 }}>
                No URL
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
