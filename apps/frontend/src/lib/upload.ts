/**
 * Resumable chunked upload utilities.
 * Chunk size: 5 MB · SHA-256 via Web Crypto · 180 s timeout · 3× retry w/ backoff
 */

export const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_CONCURRENCY = 2;

/** Per-chunk network timeout (slow Wi-Fi can take 45–60 s for 5 MB) */
export const CHUNK_TIMEOUT_MS = 180_000; // 3 minutes

/** Max attempts per chunk before surfacing a recoverable error */
export const MAX_CHUNK_RETRIES = 3;

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export type UploadState = {
  fileId: string | null;
  status: 'idle' | 'init' | 'uploading' | 'paused' | 'completed' | 'error';
  progress: number; // 0–100
  uploadedBytes: number;
  totalBytes: number;
  error: string | null;
  uploadedChunks: number[];
};

export type UploadControls = {
  start: (file: File) => Promise<void>;
  pause: () => void;
  resume: () => Promise<void>;
  abort: () => void;
};

/** SHA-256 hex digest of an ArrayBuffer / Blob */
export async function sha256(data: ArrayBuffer | Blob): Promise<string> {
  const buffer = data instanceof Blob ? await data.arrayBuffer() : data;
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Split a File into 5 MB Blob slices with metadata */
export function sliceFile(file: File) {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE) || 1;
  const chunks: { index: number; blob: Blob; start: number; end: number }[] =
    [];

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    chunks.push({
      index: i,
      blob: file.slice(start, end),
      start,
      end,
    });
  }

  return { totalChunks, chunks };
}

async function apiInit(file: File, totalChunks: number) {
  const res = await fetch(`${API}/upload/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      totalSize: file.size,
      totalChunks,
      mimeType: file.type || 'application/octet-stream',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Init failed (${res.status})`);
  }
  return res.json() as Promise<{ fileId: string }>;
}

async function apiStatus(fileId: string) {
  const res = await fetch(`${API}/upload/${fileId}/status`);
  if (!res.ok) throw new Error(`Status failed (${res.status})`);
  return res.json() as Promise<{
    status: string;
    totalChunks: number;
    uploadedChunks: number[];
  }>;
}

/**
 * Upload one chunk with an explicit timeout + AbortController.
 * Timer is always cleared in `finally` so it never leaks.
 */
async function apiChunkOnce(
  fileId: string,
  chunkIndex: number,
  checksum: string,
  blob: Blob,
  externalSignal?: AbortSignal,
): Promise<unknown> {
  const form = new FormData();
  form.append('chunk', blob, `chunk-${chunkIndex}`);

  const controller = new AbortController();
  let timedOut = false;

  // Honour an external abort (user Pause / Cancel)
  const onExternalAbort = () => controller.abort();
  externalSignal?.addEventListener('abort', onExternalAbort);

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, CHUNK_TIMEOUT_MS);

  try {
    const res = await fetch(
      `${API}/upload/${fileId}/chunk?chunkIndex=${chunkIndex}&checksum=${checksum}`,
      { method: 'POST', body: form, signal: controller.signal },
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Chunk ${chunkIndex} failed (${res.status})`);
    }
    return res.json();
  } catch (err: unknown) {
    if (timedOut) {
      throw new Error(
        `Chunk ${chunkIndex} timed out after ${CHUNK_TIMEOUT_MS / 1000}s`,
      );
    }
    // DOMException name === 'AbortError' when user paused/cancelled
    throw err;
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
}

/**
 * Retry wrapper: up to MAX_CHUNK_RETRIES attempts with exponential backoff.
 * Does NOT retry when the user intentionally aborted (paused / cancelled).
 */
async function apiChunkWithRetry(
  fileId: string,
  chunkIndex: number,
  checksum: string,
  blob: Blob,
  externalSignal?: AbortSignal,
  isUserAbort?: () => boolean,
): Promise<unknown> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_CHUNK_RETRIES; attempt++) {
    if (isUserAbort?.()) {
      throw new DOMException('Upload paused or cancelled', 'AbortError');
    }

    try {
      return await apiChunkOnce(
        fileId,
        chunkIndex,
        checksum,
        blob,
        externalSignal,
      );
    } catch (err: unknown) {
      lastError = err;

      // User-initiated abort → bubble up immediately, no retry
      if (
        isUserAbort?.() ||
        (err instanceof DOMException && err.name === 'AbortError')
      ) {
        throw err;
      }

      if (attempt < MAX_CHUNK_RETRIES) {
        // Exponential backoff: 1 s, 2 s, 4 s …
        const delayMs = 1000 * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Chunk ${chunkIndex} failed after ${MAX_CHUNK_RETRIES} retries`);
}

/**
 * High-level uploader with pause / resume / auto-retry.
 * Call createUploader(onUpdate) once, then use start / pause / resume.
 */
export function createUploader(
  onUpdate: (state: Partial<UploadState>) => void,
): UploadControls {
  let aborted = false;
  let paused = false;
  let currentFile: File | null = null;
  let fileId: string | null = null;
  let abortController: AbortController | null = null;

  const set = (partial: Partial<UploadState>) => onUpdate(partial);
  const isUserAbort = () => aborted || paused;

  async function uploadMissing(file: File, id: string) {
    const { chunks } = sliceFile(file);
    const status = await apiStatus(id);
    const done = new Set(status.uploadedChunks);

    let uploadedBytes = status.uploadedChunks.reduce((sum, idx) => {
      const c = chunks.find((x) => x.index === idx);
      return sum + (c ? c.end - c.start : 0);
    }, 0);

    set({
      status: 'uploading',
      error: null,
      uploadedChunks: [...done],
      uploadedBytes,
      progress: Math.round((uploadedBytes / file.size) * 100) || 0,
    });

    // Already finished on the server?
    if (
      status.status === 'COMPLETED' ||
      done.size >= status.totalChunks
    ) {
      set({ status: 'completed', progress: 100 });
      return;
    }

    const pending = chunks.filter((c) => !done.has(c.index));
    const queue = [...pending];
    const workers = Math.min(MAX_CONCURRENCY, queue.length || 1);

    async function worker() {
      while (queue.length > 0) {
        if (aborted) throw new DOMException('Aborted', 'AbortError');
        if (paused) return;

        const item = queue.shift();
        if (!item) return;

        abortController = new AbortController();
        const checksum = await sha256(item.blob);

        await apiChunkWithRetry(
          id,
          item.index,
          checksum,
          item.blob,
          abortController.signal,
          isUserAbort,
        );

        done.add(item.index);
        uploadedBytes += item.end - item.start;

        set({
          uploadedChunks: [...done],
          uploadedBytes,
          progress: Math.min(
            100,
            Math.round((uploadedBytes / file.size) * 100),
          ),
        });
      }
    }

    await Promise.all(Array.from({ length: workers }, () => worker()));

    if (!paused && !aborted) {
      const final = await apiStatus(id);
      if (
        final.status === 'COMPLETED' ||
        final.uploadedChunks.length >= final.totalChunks
      ) {
        set({ status: 'completed', progress: 100 });
      }
    }
  }

  return {
    async start(file: File) {
      aborted = false;
      paused = false;
      currentFile = file;
      fileId = null;

      set({
        status: 'init',
        progress: 0,
        uploadedBytes: 0,
        totalBytes: file.size,
        error: null,
        uploadedChunks: [],
        fileId: null,
      });

      try {
        const { totalChunks } = sliceFile(file);
        const { fileId: id } = await apiInit(file, totalChunks);
        fileId = id;
        set({ fileId: id, status: 'uploading' });
        await uploadMissing(file, id);
      } catch (err: unknown) {
        if (aborted || paused) return;
        const message =
          err instanceof Error ? err.message : String(err);
        // Keep fileId so Resume can pick up without re-selecting the file
        set({ status: 'error', error: message });
      }
    },

    pause() {
      paused = true;
      abortController?.abort();
      set({ status: 'paused', error: null });
    },

    /**
     * Resume from error OR paused state.
     * Always re-queries GET /status so only missing chunks are sent.
     */
    async resume() {
      if (!currentFile || !fileId) return;
      paused = false;
      aborted = false;
      set({ status: 'uploading', error: null });
      try {
        await uploadMissing(currentFile, fileId);
      } catch (err: unknown) {
        if (aborted || paused) return;
        const message =
          err instanceof Error ? err.message : String(err);
        set({ status: 'error', error: message });
      }
    },

    abort() {
      aborted = true;
      paused = false;
      abortController?.abort();
      currentFile = null;
      fileId = null;
      set({
        status: 'idle',
        progress: 0,
        uploadedBytes: 0,
        totalBytes: 0,
        fileId: null,
        error: null,
        uploadedChunks: [],
      });
    },
  };
}
