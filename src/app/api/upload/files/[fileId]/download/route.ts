import { NextRequest, NextResponse } from 'next/server';
import {
  getSupabaseServer,
  STORAGE_BUCKET,
} from '@/lib/supabaseServer';

/**
 * GET /api/upload/files/:fileId/download
 * Redirects to a short-lived signed Supabase Storage URL with Content-Disposition: attachment.
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

    const { data: file, error } = await supabase
      .from('files')
      .select('id, storage_path, filename, status')
      .eq('id', fileId)
      .single();

    if (error || !file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    if (!file.storage_path) {
      return NextResponse.json(
        { error: 'File has no storage path (still uploading or failed)' },
        { status: 409 },
      );
    }

    const { data, error: signErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(file.storage_path, 60, {
        download: file.filename || true,
      });

    if (signErr || !data?.signedUrl) {
      console.error('signed url failed', signErr);
      return NextResponse.json(
        { error: signErr?.message || 'Could not create download URL' },
        { status: 500 },
      );
    }

    return NextResponse.redirect(data.signedUrl);
  } catch (err) {
    console.error('download error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
