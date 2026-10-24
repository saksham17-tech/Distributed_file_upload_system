import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    const supabase = getSupabaseAdmin();

    // Check file status and fetch all uploaded chunk indices
    const { data: chunks, error } = await supabase
      .from('chunks') // or 'file_chunks' depending on your table name
      .select('chunk_index')
      .eq('file_id', fileId)
      .eq('status', 'uploaded');

    if (error) {
      // Fallback: if your schema stores uploaded_chunks directly or without a status filter
      const { data: allChunks } = await supabase
        .from('chunks')
        .select('chunk_index')
        .eq('file_id', fileId);

      const indices = (allChunks || []).map((c: any) => c.chunk_index);
      return NextResponse.json({ uploadedChunks: indices });
    }

    const uploadedChunks = (chunks || []).map((c: any) => c.chunk_index);
    return NextResponse.json({ uploadedChunks });
  } catch (err: any) {
    return NextResponse.json({ uploadedChunks: [], error: err.message }, { status: 500 });
  }
}