import { NextResponse } from 'next/server';
import {
  getSupabaseServer,
  STORAGE_BUCKET,
} from '@/lib/supabaseServer';

/**
 * GET /api/upload/files/list
 * Completed files + 1-hour signed download URLs.
 */
export async function GET() {
  try {
    const supabase = getSupabaseServer();

    const { data: files, error } = await supabase
      .from('files')
      .select(
        'id, filename, total_size, mime_type, storage_path, status, created_at',
      )
      .eq('status', 'COMPLETED')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('list files failed', error);
      return NextResponse.json(
        { error: error.message || 'Failed to list files' },
        { status: 500 },
      );
    }

    const result = await Promise.all(
      (files ?? []).map(async (file) => {
        let downloadUrl: string | null = null;

        if (file.storage_path) {
          const { data: signed, error: signErr } = await supabase.storage
            .from(STORAGE_BUCKET)
            .createSignedUrl(file.storage_path, 3600); // 1 hour

          if (signErr) {
            console.warn(
              `signed URL failed for ${file.id}:`,
              signErr.message,
            );
          } else {
            downloadUrl = signed?.signedUrl ?? null;
          }
        }

        return {
          id: file.id,
          filename: file.filename,
          totalSize: Number(file.total_size),
          mimeType: file.mime_type,
          storagePath: file.storage_path,
          createdAt: file.created_at,
          downloadUrl,
        };
      }),
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error('list error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
