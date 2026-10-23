import { NextResponse } from 'next/server';
import {
  getSupabaseServer,
  MAX_STORAGE_LIMIT_BYTES,
} from '@/lib/supabaseServer';

/**
 * GET /api/upload/usage/quota
 * Returns { usedBytes, limitBytes, remainingBytes, fileCount }
 */
export async function GET() {
  try {
    const supabase = getSupabaseServer();

    const { data: rows, error } = await supabase
      .from('files')
      .select('total_size')
      .neq('status', 'FAILED');

    if (error) {
      console.error('quota query failed', error);
      return NextResponse.json(
        { error: error.message || 'Failed to compute quota' },
        { status: 500 },
      );
    }

    const usedBytes = (rows ?? []).reduce(
      (acc, r) => acc + Number(r.total_size ?? 0),
      0,
    );

    return NextResponse.json({
      usedBytes,
      limitBytes: MAX_STORAGE_LIMIT_BYTES,
      remainingBytes: Math.max(0, MAX_STORAGE_LIMIT_BYTES - usedBytes),
      fileCount: rows?.length ?? 0,
    });
  } catch (err) {
    console.error('quota error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
