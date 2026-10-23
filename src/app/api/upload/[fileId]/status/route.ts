import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

/**
 * GET /api/upload/:fileId/status
 * Returns { status, totalChunks, uploadedChunks: number[] }
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ fileId: string }> },
) {
  try {
    const { fileId } = await context.params;
    if (!fileId) {
      return NextResponse.json({ error: 'Missing fileId' }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    const { data: file, error: fileErr } = await supabase
      .from('files')
      .select('id, status, total_chunks, filename, total_size, storage_path')
      .eq('id', fileId)
      .single();

    if (fileErr || !file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const { data: chunks, error: chunkErr } = await supabase
      .from('file_chunks')
      .select('chunk_index')
      .eq('file_id', fileId)
      .order('chunk_index', { ascending: true });

    if (chunkErr) {
      return NextResponse.json(
        { error: chunkErr.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      status: file.status,
      totalChunks: file.total_chunks,
      uploadedChunks: (chunks ?? []).map((c) => c.chunk_index),
      filename: file.filename,
      totalSize: Number(file.total_size),
      storagePath: file.storage_path,
    });
  } catch (err) {
    console.error('status error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
