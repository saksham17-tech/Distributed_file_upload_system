import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Lazy initializer function to prevent build-time evaluation errors
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(url, serviceKey);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    const supabaseAdmin = getSupabaseAdmin();
    const url = new URL(request.url);
    const isPermanent = url.searchParams.get('permanent') === 'true';

    if (isPermanent) {
      const { data: file } = await supabaseAdmin
        .from('files')
        .select('storage_path')
        .eq('id', fileId)
        .single();

      if (file?.storage_path) {
        await supabaseAdmin.storage.from('dfup').remove([file.storage_path]);
      }

      const { error } = await supabaseAdmin
        .from('files')
        .delete()
        .eq('id', fileId);

      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin
        .from('files')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', fileId);

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE route error:', error);
    return NextResponse.json(
      { error: error.message || 'Delete operation failed' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    const supabaseAdmin = getSupabaseAdmin();

    const { error } = await supabaseAdmin
      .from('files')
      .update({ deleted_at: null })
      .eq('id', fileId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('PATCH restore error:', error);
    return NextResponse.json(
      { error: error.message || 'Restore operation failed' },
      { status: 500 }
    );
  }
}