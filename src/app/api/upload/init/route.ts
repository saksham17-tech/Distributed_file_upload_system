import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

/**
 * POST /api/upload/init
 * Body: { filename, totalSize, totalChunks, mimeType }
 * Returns 201 { fileId }.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const filename = String(body.filename ?? '').trim();
    const totalSize = Number(body.totalSize);
    const totalChunks = Number(body.totalChunks);
    const mimeType = String(body.mimeType || 'application/octet-stream');

    if (!filename || !Number.isFinite(totalSize) || totalSize <= 0) {
      return NextResponse.json(
        { error: 'filename and totalSize are required' },
        { status: 400 },
      );
    }
    if (!Number.isFinite(totalChunks) || totalChunks < 1) {
      return NextResponse.json(
        { error: 'totalChunks must be >= 1' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServer();

    const { data: file, error: insertErr } = await supabase
      .from('files')
      .insert({
        filename,
        total_size: totalSize,
        total_chunks: totalChunks,
        mime_type: mimeType,
        status: 'UPLOADING',
      })
      .select('id')
      .single();

    if (insertErr || !file) {
      console.error('insert failed', insertErr);
      return NextResponse.json(
        { error: insertErr?.message || 'Failed to create file record' },
        { status: 500 },
      );
    }

    return NextResponse.json({ fileId: file.id }, { status: 201 });
  } catch (err) {
    console.error('init error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
