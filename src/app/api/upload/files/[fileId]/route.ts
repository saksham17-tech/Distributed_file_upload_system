import { NextRequest, NextResponse } from 'next/server';
import {
  getSupabaseServer,
  STORAGE_BUCKET,
} from '@/lib/supabaseServer';

/**
 * DELETE /api/upload/files/:fileId
 * Removes the object from Supabase Storage (if storage_path set)
 * and deletes the files row (cascades to file_chunks).
 */
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ fileId: string }> },
) {
  try {
    const { fileId } = await context.params;
    if (!fileId) {
      return NextResponse.json({ error: 'Missing fileId' }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    const { data: file, error: fetchErr } = await supabase
      .from('files')
      .select('id, storage_path, filename, status')
      .eq('id', fileId)
      .single();

    if (fetchErr || !file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Collect storage paths to remove (merged object + any leftover chunks)
    const pathsToRemove: string[] = [];

    if (file.storage_path) {
      pathsToRemove.push(file.storage_path);
    }

    // Best-effort: also wipe any residual chunk objects under chunks/{fileId}/
    const { data: listed } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(`chunks/${fileId}`, { limit: 10_000 });

    if (listed?.length) {
      for (const obj of listed) {
        if (obj.name) {
          pathsToRemove.push(`chunks/${fileId}/${obj.name}`);
        }
      }
    }

    if (pathsToRemove.length > 0) {
      const { error: rmErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove(pathsToRemove);

      if (rmErr) {
        // Log but still attempt DB delete so the UI can recover from orphans
        console.warn('storage remove warning:', rmErr.message);
      }
    }

    const { error: delErr } = await supabase
      .from('files')
      .delete()
      .eq('id', fileId);

    if (delErr) {
      console.error('db delete failed', delErr);
      return NextResponse.json(
        { error: delErr.message || 'Failed to delete file record' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, fileId });
  } catch (err) {
    console.error('delete error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
