'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createUploader,
  type UploadState,
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

type Props = {
  onSuccess?: () => void;
};

export default function FileUploader({ onSuccess }: Props) {
  const [state, setState] = useState<UploadState>(initial);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const prevStatus = useRef<UploadState['status']>('idle');
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const uploaderRef = useRef(
    createUploader((partial) => {
      setState((prev) => ({ ...prev, ...partial }));
    }),
  );

  useEffect(() => {
    if (prevStatus.current !== 'completed' && state.status === 'completed') {
      onSuccessRef.current?.();
    }
    prevStatus.current = state.status;
  }, [state.status]);

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
  } = state;

  const isActive = status === 'uploading' || status === 'init';
  const isProcessing = status === 'processing';
  const isPaused = status === 'paused';
  const isDone = status === 'completed';
  const isError = status === 'error';
  const isMerging =
    isProcessing ||
    (isActive && totalBytes > 0 && uploadedBytes >= totalBytes);
  const canResume = (isPaused || isError) && !!fileId && !!selectedName;

  return (
    <div className="mb-5 rounded-2xl border border-zinc-800/50 bg-zinc-900/70 p-5 shadow-sm backdrop-blur-xl transition-all duration-200">
      <h2 className="m-0 text-lg font-medium text-zinc-100">Upload</h2>

      <label
        className={`mt-4 block cursor-pointer rounded-xl border border-dashed border-zinc-700 bg-zinc-950/60 p-10 text-center transition-colors hover:border-zinc-500 ${
          isActive || isMerging ? 'pointer-events-none opacity-50' : ''
        }`}
      >
        <input
          type="file"
          onChange={onFile}
          disabled={isActive || isMerging}
          className="hidden"
        />
        {selectedName ? (
          <span className="font-medium text-zinc-100">{selectedName}</span>
        ) : (
          <span className="text-zinc-500">Drop a file or click to browse</span>
        )}
      </label>

      {(isActive || isProcessing || isPaused || isDone || isError) && (
        <div className="mt-5">
          <div className="h-2 overflow-hidden rounded-full bg-zinc-800/80">
            <div
              className="h-full rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${Math.min(100, Math.max(0, progress))}%`,
                background: isError
                  ? '#ef4444'
                  : isDone
                    ? '#22c55e'
                    : isPaused
                      ? '#eab308'
                      : '#a1a1aa',
              }}
            />
          </div>

          <div className="mt-2 flex justify-between text-xs text-zinc-500">
            <span>
              {formatBytes(uploadedBytes)} / {formatBytes(totalBytes)}
            </span>
            <span>
              {progress >= 100 ? 100 : Math.min(99.9, progress).toFixed(1)}%
            </span>
          </div>

          <div className="mt-2 text-sm">
            {isMerging && !isDone ? (
              <span className="animate-pulse font-medium text-zinc-300">
                Saving to your files... Please wait.
              </span>
            ) : (
              <span className={isDone ? 'font-medium text-green-400' : 'text-zinc-500'}>
                {isDone ? 'Upload completed' : status}
              </span>
            )}
          </div>

          {error && (
            <p className="mt-2 text-sm text-red-400">
              {error}
              {canResume && (
                <span className="mt-1 block text-zinc-500">
                  Progress is saved. Click Resume to continue.
                </span>
              )}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {isActive && !isMerging && (
              <button
                type="button"
                onClick={() => uploaderRef.current.pause()}
                className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-white"
              >
                Pause
              </button>
            )}
            {canResume && (
              <button
                type="button"
                onClick={() => uploaderRef.current.resume()}
                className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-white"
              >
                Resume
              </button>
            )}
            {(isActive || isPaused || isError) && !isMerging && (
              <button
                type="button"
                onClick={() => {
                  uploaderRef.current.abort();
                  setSelectedName(null);
                }}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
              >
                Cancel
              </button>
            )}
            {isDone && (
              <button
                type="button"
                onClick={() => {
                  setState(initial);
                  setSelectedName(null);
                }}
                className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 transition-colors hover:bg-white"
              >
                Upload another
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
