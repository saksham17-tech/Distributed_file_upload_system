import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import {
  getSupabaseServer,
  STORAGE_BUCKET,
} from '@/lib/supabaseServer';

/**
 * POST /api/upload/:fileId/chunk?chunkIndex=&checksum=
 * Multipart field: "chunk" (binary)
 *
 * Flow:
 *  1. Verify SHA-256
 *  2. Store chunk at  dfup/chunks/{fileId}/{chunkIndex}
 *  3. Upsert file_chunks row
 *  4. When all chunks are present → merge into one object, mark COMPLETED
 *
 * Merge note (serverless):
 *  Supabase Storage has no server-side concat API. We download each chunk
 *  into this Route Handler, Buffer.concat, then re-upload. That means peak
 *  memory ≈ file size. Fine for free-tier ≤ 1 GB on a roomy Node process;
 *  on strict serverless (e.g. Vercel 1024–3008 MB limits) prefer smaller
 *  files or a TUS/direct-to-storage path for very large uploads.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ fileId: string }> },
) {
  try {
    const { fileId } = await context.params;
    const chunkIndex = Number(req.nextUrl.searchParams.get('chunkIndex'));
    const checksum = (req.nextUrl.searchParams.get('checksum') || '')
      .trim()
      .toLowerCase();

    if (!fileId || !Number.isInteger(chunkIndex) || chunkIndex < 0) {
      return NextResponse.json(
        { error: 'Invalid fileId or chunkIndex' },
        { status: 400 },
      );
    }
    if (!checksum) {
      return NextResponse.json(
        { error: 'Missing checksum query param' },
        { status: 400 },
      );
    }

    const form = await req.formData();
    const chunk = form.get('chunk');
    if (!chunk || !(chunk instanceof Blob)) {
      return NextResponse.json(
        { error: 'Missing chunk file (field name: "chunk")' },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await chunk.arrayBuffer());
    const actual = createHash('sha256').update(buffer).digest('hex');

    if (actual !== checksum) {
      return NextResponse.json(
        {
          error: `Checksum mismatch for chunk ${chunkIndex}: expected ${checksum}, got ${actual}`,
        },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServer();

    const { data: file, error: fileErr } = await supabase
      .from('files')
      .select('id, total_chunks, status, filename, mime_type')
      .eq('id', fileId)
      .single();

    if (fileErr || !file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    if (file.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'File already completed' },
        { status: 400 },
      );
    }
    if (file.status === 'FAILED') {
      return NextResponse.json(
        { error: 'File is in FAILED state' },
        { status: 400 },
      );
    }
    if (chunkIndex >= file.total_chunks) {
      return NextResponse.json(
        {
          error: `chunkIndex ${chunkIndex} out of range [0, ${file.total_chunks - 1}]`,
        },
        { status: 400 },
      );
    }

    // ── 1. Persist chunk object ──────────────────────────────────────────
    const objectPath = `chunks/${fileId}/${chunkIndex}`;
    const { error: upErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(objectPath, buffer, {
        contentType: 'application/octet-stream',
        upsert: true,
      });

    if (upErr) {
      console.error('storage upload failed', upErr);
      return NextResponse.json(
        { error: `Storage error: ${upErr.message}` },
        { status: 500 },
      );
    }

    // ── 2. Upsert metadata (idempotent) ──────────────────────────────────
    const { error: upsertErr } = await supabase.from('file_chunks').upsert(
      {
        file_id: fileId,
        chunk_index: chunkIndex,
        chunk_size: buffer.length,
        checksum: actual,
      },
      { onConflict: 'file_id,chunk_index' },
    );

    if (upsertErr) {
      await supabase
        .from('file_chunks')
        .delete()
        .eq('file_id', fileId)
        .eq('chunk_index', chunkIndex);

      const { error: insErr } = await supabase.from('file_chunks').insert({
        file_id: fileId,
        chunk_index: chunkIndex,
        chunk_size: buffer.length,
        checksum: actual,
      });

      if (insErr) {
        console.error('chunk metadata insert failed', insErr);
        return NextResponse.json({ error: insErr.message }, { status: 500 });
      }
    }

    // ── 3. Completion check ──────────────────────────────────────────────
    const { count, error: countErr } = await supabase
      .from('file_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('file_id', fileId);

    if (countErr) {
      console.error('count failed', countErr);
      return NextResponse.json({ error: countErr.message }, { status: 500 });
    }

    const uploadedCount = count ?? 0;
    let completed = false;
    let storagePath: string | null = null;

    if (uploadedCount >= file.total_chunks) {
      storagePath = await mergeChunks(supabase, fileId, file);
      completed = true;
    }

    return NextResponse.json(
      {
        ok: true,
        chunkIndex,
        uploadedChunks: uploadedCount,
        totalChunks: file.total_chunks,
        completed,
        storagePath,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error('chunk error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}

/**
 * Download every chunk in index order, Buffer.concat, upload merged object,
 * delete intermediate chunks, mark file COMPLETED.
 *
 * Final object path:  merged/{fileId}/{filename}
 * (fileId prefix avoids collisions when two users upload the same name)
 */
async function mergeChunks(
  supabase: ReturnType<typeof getSupabaseServer>,
  fileId: string,
  file: {
    total_chunks: number;
    filename: string;
    mime_type: string;
  },
): Promise<string> {
  try {
    // Prefer listing Storage so we only merge objects that actually exist,
    // then sort numerically (string sort would put "10" before "2").
    const { data: listed, error: listErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(`chunks/${fileId}`, { limit: 10_000 });

    let orderedPaths: string[];

    if (!listErr && listed && listed.length > 0) {
      orderedPaths = listed
        .filter((o) => o.name && /^\d+$/.test(o.name))
        .sort((a, b) => Number(a.name) - Number(b.name))
        .map((o) => `chunks/${fileId}/${o.name}`);

      if (orderedPaths.length < file.total_chunks) {
        throw new Error(
          `Expected ${file.total_chunks} chunks in storage, found ${orderedPaths.length}`,
        );
      }
    } else {
      // Fallback: sequential indices 0..total_chunks-1
      orderedPaths = Array.from(
        { length: file.total_chunks },
        (_, i) => `chunks/${fileId}/${i}`,
      );
    }

    // Sequential download → append into one Buffer
    const parts: Buffer[] = [];
    for (const path of orderedPaths) {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(path);

      if (error || !data) {
        throw new Error(`Missing chunk object ${path}: ${error?.message}`);
      }
      parts.push(Buffer.from(await data.arrayBuffer()));
    }

    const assembled = Buffer.concat(parts);
    const finalPath = `merged/${fileId}/${file.filename}`;

    const { error: upErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(finalPath, assembled, {
        contentType: file.mime_type || 'application/octet-stream',
        upsert: true,
      });

    if (upErr) {
      throw new Error(`Final upload failed: ${upErr.message}`);
    }

    // Best-effort cleanup of intermediate chunk objects
    await supabase.storage.from(STORAGE_BUCKET).remove(orderedPaths);

    const { error: dbErr } = await supabase
      .from('files')
      .update({ status: 'COMPLETED', storage_path: finalPath })
      .eq('id', fileId);

    if (dbErr) {
      throw new Error(`DB update failed after merge: ${dbErr.message}`);
    }

    console.log(
      `Merged ${orderedPaths.length} chunks → ${STORAGE_BUCKET}/${finalPath} (${assembled.length} bytes)`,
    );

    return finalPath;
  } catch (err) {
    console.error(`merge failed for ${fileId}`, err);
    await supabase
      .from('files')
      .update({ status: 'FAILED' })
      .eq('id', fileId);
    throw err;
  }
}
