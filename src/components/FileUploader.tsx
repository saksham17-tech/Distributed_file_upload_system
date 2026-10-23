'use client';

import { useCallback, useRef, useState } from 'react';
import {
  createUploader,
  type UploadState,
  CHUNK_SIZE,
  CHUNK_TIMEOUT_MS,
  MAX_CHUNK_RETRIES,
  MAX_CONCURRENT_UPLOADS,
} from '@/lib/upload';

const initial: UploadState = {
  fileId: null,
  status: 'idle',
  progress: 0,
  uploadedBytes: 0,
  totalBytes: 0,
  error: null,
  uploadedChunks: [],
};

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function FileUploader() {
  const [state, setState] = useState<UploadState>(initial);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const uploaderRef = useRef(
    createUploader((partial) => {
      setState((prev) => ({ ...prev, ...partial }));
    }),
  );

  const onFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedName(file.name);
    await uploaderRef.current.start(file);
  }, []);

  const {
    status,
    progress,
    uploadedBytes,
    totalBytes,
    error,
    fileId,
    uploadedChunks,
  } = state;

  const isActive = status === 'uploading' || status === 'init';
  const isProcessing = status === 'processing';
  const isPaused = status === 'paused';
  const isDone = status === 'completed';
  const isError = status === 'error';
  // Bytes fully sent but server still merging
  const isMerging =
    isProcessing ||
    (isActive && totalBytes > 0 && uploadedBytes >= totalBytes);
  /** Resume is available on both pause and recoverable error */
  const canResume = (isPaused || isError) && !!fileId && !!selectedName;

  return (
    <div
      style={{
        maxWidth: 480,
        margin: '2rem auto',
        padding: '1.5rem',
        borderRadius: 12,
        border: '1px solid #333',
        background: '#111',
        color: '#eee',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h2 style={{ marginTop: 0, fontSize: '1.25rem' }}>
        Resumable Chunked Uploader
      </h2>
      <p style={{ color: '#888', fontSize: 13, marginBottom: '1.25rem' }}>
        5&nbsp;MB chunks · {MAX_CONCURRENT_UPLOADS} concurrent · SHA-256 ·{' '}
        {CHUNK_TIMEOUT_MS / 1000}s timeout · {MAX_CHUNK_RETRIES}× retry · 1&nbsp;GB quota
      </p>

      <label
        style={{
          display: 'block',
          padding: '1.5rem',
          border: '2px dashed #444',
          borderRadius: 8,
          textAlign: 'center',
          cursor: isActive ? 'not-allowed' : 'pointer',
          opacity: isActive ? 0.6 : 1,
        }}
      >
        <input
          type="file"
          onChange={onFile}
          disabled={isActive}
          style={{ display: 'none' }}
        />
        {selectedName ? (
          <span>{selectedName}</span>
        ) : (
          <span style={{ color: '#aaa' }}>Click to choose a file</span>
        )}
      </label>

      {(isActive || isProcessing || isPaused || isDone || isError) && (
        <div style={{ marginTop: '1.25rem' }}>
          <div
            style={{
              height: 8,
              background: '#222',
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.min(100, Math.max(0, progress))}%`,
                background: isError
                  ? '#e11'
                  : isDone
                    ? '#0a0'
                    : isMerging
                      ? '#eab308'
                      : isPaused
                        ? '#c90'
                        : '#3b82f6',
                transition: 'width 300ms ease-out, background-color 300ms ease', /* smooth glide */
                willChange: 'width',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 13,
              marginTop: 8,
              color: '#aaa',
            }}
          >
            <span>
              {formatBytes(uploadedBytes)} / {formatBytes(totalBytes)}
            </span>
            <span>{progress >= 100 ? 100 : Math.min(99.9, progress).toFixed(1)}%</span>
          </div>

          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            Status:{' '}
            {isMerging && !isDone ? (
              <span
                style={{
                  color: '#eab308',
                  fontWeight: 600,
                  animation: 'dfup-pulse 1.2s ease-in-out infinite',
                }}
              >
                Processing and merging on server…
              </span>
            ) : (
              <strong style={{ color: isDone ? '#4ade80' : '#ccc' }}>
                {isDone ? 'Upload completed' : status}
              </strong>
            )}
            {fileId && (
              <>
                {' '}
                · fileId: <code>{fileId.slice(0, 8)}…</code>
              </>
            )}
            {uploadedChunks.length > 0 && (
              <> · chunks: {uploadedChunks.length}</>
            )}
          </div>

          {error && (
            <p style={{ color: '#f66', fontSize: 13, marginTop: 8 }}>
              {error}
              {canResume && (
                <span style={{ color: '#aaa', display: 'block', marginTop: 4 }}>
                  Progress is saved. Click <strong>Resume Upload</strong> to
                  continue from the last successful chunk.
                </span>
              )}
            </p>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {isActive && !isMerging && (
              <button
                type="button"
                onClick={() => uploaderRef.current.pause()}
                style={btnStyle}
              >
                Pause
              </button>
            )}

            {/* Resume works for both paused AND error states */}
            {canResume && (
              <button
                type="button"
                onClick={() => uploaderRef.current.resume()}
                style={{
                  ...btnStyle,
                  background: isError ? '#16a34a' : '#3b82f6',
                }}
              >
                Resume Upload
              </button>
            )}

            {(isActive || isPaused || isError) && !isMerging && (
              <button
                type="button"
                onClick={() => {
                  uploaderRef.current.abort();
                  setSelectedName(null);
                }}
                style={{ ...btnStyle, background: '#333' }}
              >
                Cancel
              </button>
            )}
            {isMerging && !isDone && (
              <span style={{ fontSize: 12, color: '#888', alignSelf: 'center' }}>
                Please wait — do not close this tab
              </span>
            )}

            {isDone && (
              <button
                type="button"
                onClick={() => {
                  setState(initial);
                  setSelectedName(null);
                }}
                style={btnStyle}
              >
                Upload another
              </button>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes dfup-pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }`}</style>
      <p style={{ fontSize: 11, color: '#555', marginTop: '1.5rem' }}>
        Chunk size: {formatBytes(CHUNK_SIZE)}. On timeout or network drop the
        client retries up to {MAX_CHUNK_RETRIES} times, then shows Resume so you
        never re-upload finished chunks.
      </p>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: 6,
  border: 'none',
  background: '#3b82f6',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
};
